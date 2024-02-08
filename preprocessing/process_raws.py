import numpy as np
from PIL import Image
import os
import sys
import cv2
from skimage import color, feature, filters, measure, morphology
from skimage.segmentation import watershed
from scipy import ndimage as ndi
from skimage.feature import peak_local_max
import matplotlib.pyplot as plt

lin_polar = []
cross_polars = []

# aligns images to the lin. if not aligned already
def get_images(folder_path, folder_name):
    global lin_polar
    global cross_polars
    all_files = os.listdir(folder_path)

    # Get the linear-polarized image
    lin_file = next((f for f in all_files if 'lin' in f and f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG'))), None)
    if not lin_file:
        print("No linear-polarized file found!")
        return {}
    
    lin_img_path = os.path.join(folder_path, lin_file)
    with Image.open(lin_img_path) as img:
        lin_polar = np.array(img)

    # For storing the arrays
    image_dict = {}
    
    # Filter for cross-polar images and exclude ones that are already aligned
    cps = [f for f in all_files if f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG')) and 'composite' not in f and 'lin' not in f and 'sobel' not in f]
    
    lin_aligned = True
    for cp in cps:
        img_path = os.path.join(folder_path, cp)
        if not cp.startswith('aligned_'):
            print("CPs NOT ALIGNED")
            lin_aligned = False
            with Image.open(img_path) as img:
                arr = np.array(img)
                aligned_image = align_images(arr, lin_polar)
                
                aligned_img_name = os.path.join(folder_path, "aligned_" + cp)

                Image.fromarray(aligned_image).save(aligned_img_name)
                
                # Delete the original image
                os.remove(img_path)
                
                image_dict["aligned_" + cp] = aligned_image
        else:
            print("CPs ALIGNED. FETCHING...")
            # If the image is already aligned, just read it and add to the dictionary
            with Image.open(img_path) as img:
                arr = np.array(img)
                image_dict[cp] = arr
    
    # save the lin polar in the same orientation as the aligned images
    if not lin_aligned:
        Image.fromarray(lin_polar).save(lin_img_path)

    cross_polars = list(image_dict.values())

#align images
def align_images(img, reference, blend_width=100):
    """Aligns images using phase correlation and blends the boundaries."""

    # Ensure the images are in the same orientation
    if img.shape != reference.shape:
        img = np.transpose(img, (1, 0, 2))

    dft_ref = np.fft.fft2(reference[:,:,0])
    dft_img = np.fft.fft2(img[:,:,0])
    cross_power_spectrum = dft_ref * np.conj(dft_img)
    r0 = np.fft.ifft2(cross_power_spectrum / (abs(cross_power_spectrum) + 1e-5))
    
    shift = np.unravel_index(np.argmax(r0), r0.shape)
    shift = tuple((s if s < r0.shape[i] // 2 else s - r0.shape[i]) for i, s in enumerate(shift))
    
    aligned = np.roll(img, shift, axis=(0,1))
    
    # Create a linear gradient mask
    rows, cols, _ = aligned.shape
    mask = np.ones((rows, cols))

    mask[:blend_width] = np.linspace(0, 1, blend_width)[:, None]
    mask[-blend_width:] = np.linspace(1, 0, blend_width)[:, None]
    mask[:, :blend_width] *= np.linspace(0, 1, blend_width)
    mask[:, -blend_width:] *= np.linspace(1, 0, blend_width)

    # Blend using the mask
    blended = aligned * mask[:,:,None] + img * (1 - mask[:,:,None])
    
    return blended.astype(np.uint8)

def create_bright_composite(arrays):
    stacked = np.stack(arrays)
    # For every pixel, get the maximum value across all images
    composite = np.max(stacked, axis=0)
    return composite  # convert back to uint8 type

def normalize(image):

    # if any negative values, dont lose that data: shift all values into positive, to create floor at 0.
    absolute = image
    min_val = np.min(image)

    if(min_val < 0):
        absolute = absolute + abs(min_val)
    
    min_val = np.min(absolute)
    max_val = np.max(absolute)

    normalized = ((absolute - min_val) / (max_val - min_val)) * 255
    return normalized.astype(np.uint8)

def create_sobel(image):
    # Convert the image to HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    # Extract the H, S, or V channel
    channel = hsv[:,:,2]
    scales = [0.2, 0.4, 0.6, 0.8, 1]  # You can modify these values based on your needs.

    combined_edges = np.zeros_like(channel, dtype=float)

    for scale in scales:
        resized = cv2.resize(channel, (0,0), fx=scale, fy=scale)
        sobelx = cv2.Sobel(resized, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(resized, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        magnitude = cv2.resize(magnitude, (channel.shape[1], channel.shape[0]))  # Resize back to original size
        combined_edges += magnitude

    return combined_edges

def get_value(image):
    # Convert the image to HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    # Extract the H, S, or V channel
    return hsv[:,:,2]

def show_images(images, title="Image Grid", max_width=3):
    """
    Shows images in a wxh grid, where the max width is 3.
    
    Parameters:
    - images: List of images to show.
    - title: Window title.
    - max_width: Maximum number of images in a row.
    """
    # Calculate the number of rows needed to display the images
    rows = [images[i:i+max_width] for i in range(0, len(images), max_width)]
    
    # Create the horizontal stacks for each row
    hstacks = [np.hstack(row) for row in rows if row]
    
    # Stack rows vertically
    vstack = np.vstack(hstacks)
    
    # Display the images
    cv2.imshow(title, vstack)
    cv2.waitKey(0)  # Wait until a key is pressed
    cv2.destroyAllWindows()  # Close the window

def apply_watershed_on_channel(channel):
    # Apply threshold to find major objects
    _, thresh = cv2.threshold(channel, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Use morphological operations to remove noise and find sure background
    kernel = np.ones((3, 3), np.uint8)
    sure_bg = cv2.dilate(thresh, kernel, iterations=2)

    # Distance transform and thresholding to find foreground
    dist_transform = cv2.distanceTransform(thresh, cv2.DIST_L2, 5)
    _, sure_fg = cv2.threshold(dist_transform, 0.2 * dist_transform.max(), 255, 0)

    # Find unknown region
    sure_fg = np.uint8(sure_fg)
    unknown = cv2.subtract(sure_bg, sure_fg)

    # Label markers
    _, markers = cv2.connectedComponents(sure_fg)
    markers = markers + 1
    markers[unknown == 255] = 0
    print("MAX | MIN: " + str(markers.max()) + " | " + str(markers.min()))
    plt.imshow(markers)
    plt.show()
    # Apply watershed
    return markers

def apply_watershed_to_hsv(image):
    # Convert image to HSV

    hsv_image = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    h, s, v = cv2.split(hsv_image)

    # Apply watershed to each channel
    markers_h = apply_watershed_on_channel(h)
    markers_s = apply_watershed_on_channel(s)
    markers_v = apply_watershed_on_channel(v)

    print("MARKERS_H: " + str(markers_h))
    print("MARKERS_S: " + str(markers_s))
    print("MARKERS_V: " + str(markers_v))

    # Create an image to overlay the segmentation
    overlay = np.zeros_like(image)

    # Overlay each segmentation in different colors
    overlay[markers_h == -1] = [255, 0, 0]  # Red for H channel
    overlay[markers_s == -1] = [0, 255, 0]  # Green for S channel
    overlay[markers_v == -1] = [0, 0, 255]  # Blue for V channel

    plt.imshow(overlay)
    plt.show()
    # Merge the overlay with the original image
    segmented_image = cv2.addWeighted(image, 1, overlay, 0.25, 1)

    return segmented_image

def denoise_bilateral_filter(image):
    print("denoise_and_bilateral_filter()")
    # if not uint8, normalize to 0-255 range and convert to uint8
    if image.dtype != np.uint8:
        image = normalize(image)

    # convert rgb to bgr
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    # Denoise the image
    denoised_img = cv2.fastNlMeansDenoisingColored(image, None, 100, 100, 21, 21)

    # # apply bilateral filter and denoised image
    # cv2.imshow('Denoised', bilateral_filtered_img)
    # cv2.waitKey(0)  # Wait until a key is pressed

    # Apply bilateral filter
    bilateral_filtered_img = cv2.bilateralFilter(denoised_img, 35, 64, 64)

    # show the original image, the denoised, and the bilateral filtered + denoised image all side by side in a single window
    show_images([image, denoised_img, bilateral_filtered_img], "Original | Denoised | Bilateral Filtered")
    bilateral_filtered_img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    return bilateral_filtered_img_rgb

def bilateral_filter_with_variables(img, diameter, sigma_color, sigma_space):
    blur = cv2.bilateralFilter(normalize(img), diameter, sigma_color, sigma_space)
    hsv_blur = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Apply the bilateral filter to each channel
    sat_filtered = normalize(cv2.bilateralFilter(hsv[:, :, 1], diameter, sigma_color, sigma_space))
    val_filtered = normalize(cv2.bilateralFilter(hsv[:, :, 2], diameter, sigma_color, sigma_space))

    # Merge the filtered channels back into an HSV image
    filtered_hsv = cv2.merge([hsv_blur[:, :, 0], sat_filtered, val_filtered])
    blur = cv2.cvtColor(filtered_hsv, cv2.COLOR_HSV2RGB)
    return blur;

def median_blur(image, numPixels):
     # if not uint8, normalize to 0-255 range and convert to uint8
    if image.dtype != np.uint8:
        image = normalize(image)

    # convert rgb to bgr
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    mediunBlurred = cv2.medianBlur(image, numPixels);

    return cv2.cvtColor(mediunBlurred, cv2.COLOR_BGR2RGB)


def median_blur_with_range(img, start, end, interval):
    for i in range(start, end, interval):
        img = median_blur(img, i)
    return img

def apply_median_shift_bilateral_filter(image):
    # Run mediun blur with iteratively starting from 9 pixels and going to 15, with an interval of 2.
    image = median_blur_with_range(image, 9, 15, 2)

    resized_image = cv2.resize(image, (image.shape[1] //4, image.shape[0] // 4), interpolation=cv2.INTER_AREA);

    # Running bilateral filter multiple times on the same image.
    for i in range(0, 6):
        resized_image = bilateral_filter_with_variables(resized_image, 50, 25, 25)
    
    return resized_image

###### BEGIN ######

folder_path = ''
folder_name = ''

if len(sys.argv) > 3 | len(sys.argv) <= 1:
    print("Usage: python3 process_raws.py <input_folder> <identifier>")
    sys.exit(1)

if len(sys.argv) == 3: 
    folder_path = sys.argv[1]
    folder_name = sys.argv[2]

if len(sys.argv) == 2: 
    folder_path = sys.argv[1]
    folder_name = os.path.basename(folder_path)

###### GET + ALIGN IMAGES ######

get_images(folder_path, folder_name)

###### CREATE LIN POLAR COMPOSITE SOBEL ######
lin_sobel = create_sobel(lin_polar) 
lin_value = get_value(lin_polar)
###### CREATE BRIGHT COMPOSITE + SOBEL ######
bright_composite = create_bright_composite(cross_polars)

print("GENERATING COMPOSITE...")
Image.fromarray(bright_composite).save(os.path.join(folder_path, folder_name+"_composite.jpg"))
bright_composite_sobel = create_sobel(bright_composite)
bright_composite_value = get_value(bright_composite)

###### CREATE SOBELS FROM CROSS POLARS ######
# note these sobels havent been normalized yet
sobels = [create_sobel(cp) for cp in cross_polars]
values = [get_value(cp) for cp in cross_polars]
stacked_sobels = np.stack(sobels)
stacked_values = np.stack(values)

#sum_composite_sobel = normalize(np.sum(stacked_sobels, axis=0)) 
max_composite_minus_bright_sobel = normalize(np.max(stacked_sobels, axis=0)-bright_composite_sobel) # WINNER
#bright_minus_values = normalize(np.max(bright_composite_value-stacked_values, axis=0))

#xpls_minus_bright_minus_lin_sobel = normalize(np.max(stacked_sobels, axis=0)-lin_sobel) 
#cv2.imshow('MAX - BRIGHT', max_composite_minus_bright_sobel)
#cv2.imshow('BRIGHT - VALUES', cv2.cvtColor(bright_minus_values, cv2.COLOR_RGB2BGR))

print("GENERATING SOBEL...")
Image.fromarray(max_composite_minus_bright_sobel).save(os.path.join(folder_path, folder_name+"_sobel.jpg"))

denoise_bf_img = denoise_bilateral_filter(bright_composite)

# print("APPLYING WATERSHED (FINDING GRAIN BOUNDARIES)...")

# watershed_img = apply_watershed_to_hsv(blurred)
# # watershed = create_watersheds(cross_polars)
# print(watershed_img.shape)
# print("MAX | MIN: " + str(watershed_img.max()) + " | " + str(watershed_img.min()))
# plt.imshow(watershed_img)
# plt.show()
# Convert the watershed array to a 2D or 3D array
# watershed_2d = np.squeeze(watershed)

# # Convert the data type to uint8
# watershed_uint8 = (watershed_2d * 255).astype(np.uint8)

# # Save the image
# Image.fromarray(watershed_uint8).save(os.path.join(folder_path, folder_name+"_watershed.jpg"))

# # Image.fromarray(watershed).save(os.path.join(folder_path, folder_name+"_watershed.jpg"))
