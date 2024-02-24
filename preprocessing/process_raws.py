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
from sklearn.cluster import KMeans
from skimage.io import imread
import matplotlib.pyplot as plt
from kneed import KneeLocator
from sklearn.metrics import pairwise_distances_argmin

from edge_detection import detect_edges_and_combine_for_images, overlay_edges_on_image
from contouring import mark_area_on_image_which_resemble_color_scheme
from utils import show_images, resize_images, normalize

lin_polar = []
cross_polars = []
composite = []
sobel = []
blurred_images = []

pause_to_display_images = True

# aligns images to the lin. if not aligned already
def get_images(folder_path, folder_name):
    global lin_polar
    global cross_polars
    global sobel
    global composite
    all_files = os.listdir(folder_path)

    # Get the linear-polarized image
    lin_file = next((f for f in all_files if 'lin' in f and f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG'))), None)
    if not lin_file:
        print("NO LIN POLAR IMAGE FOUND: please label linearly polarized image with '_lin' suffix. Exiting...")
        # terminate program if no lin polar image found
        sys.exit(1)
    
    lin_img_path = os.path.join(folder_path, lin_file)
    with Image.open(lin_img_path) as img:
        lin_polar = np.array(img)

    # get the composite image, if it exists
    composite_file = next((f for f in all_files if 'composite' in f and f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG'))), None)
    if composite_file:
        print("COMPOSITE IMAGE FOUND. FETCHING...")
        composite_path = os.path.join(folder_path, composite_file)
        with Image.open(composite_path) as img:
            composite = np.array(img)

    # get the sobel image, if it exists
    sobel_file = next((f for f in all_files if 'sobel' in f and f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG'))), None)
    if sobel_file:
        print("SOBEL IMAGE FOUND. FETCHING...")
        sobel_path = os.path.join(folder_path, sobel_file)
        with Image.open(sobel_path) as img:
            sobel = np.array(img)

    
    # Filter for cross-polar images and exclude ones that are already aligned
    cps = [f for f in all_files if f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG')) and 'composite' not in f and 'lin' not in f and 'sobel' not in f and 'msbf' not in f and 'edges' not in f]
    
    # For storing the cross-polarized images
    temp_dict = {}

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
                
                temp_dict["aligned_" + cp] = aligned_image
        else:
            print("CPs ALIGNED. FETCHING...")
            # If the image is already aligned, just read it and add to the dictionary
            with Image.open(img_path) as img:
                arr = np.array(img)
                temp_dict[cp] = arr
    
    # save the lin polar in the same orientation as the aligned images
    if not lin_aligned:
        Image.fromarray(lin_polar).save(lin_img_path)

    cross_polars = list(temp_dict.values())

    # get ms_bfs images, if they exist
    ms_bf_files = [f for f in all_files if f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG')) and 'msbf' in f]
    if(len(ms_bf_files) > 0):
        print("MS_BF IMAGES FOUND. FETCHING...")
    for file in ms_bf_files:
        path = os.path.join(folder_path, file)
        with Image.open(path) as img:
            arr = np.array(img)
            blurred_images.append(arr)

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

def create_composite(arrays):
    stacked = np.stack(arrays)
    # For every pixel, get the maximum value across all images
    composite = np.max(stacked, axis=0)
    return composite  # convert back to uint8 type

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

def apply_denoise_bilateral_filter(image):
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
    show_images([image, denoised_img, bilateral_filtered_img], "Original | Denoised | Bilateral Filtered", pause_to_display_images)
    bilateral_filtered_img_rgb = cv2.cvtColor(bilateral_filtered_img, cv2.COLOR_BGR2RGB)

    return bilateral_filtered_img_rgb

def assign_channel_to_centroids(image_channel, centroids):
    """
    Assigns each pixel in the image to the nearest centroid and creates a new image
    where each pixel's color is that of the centroid it's been assigned to.
    
    :param image: The input image as a NumPy array.
    :param centroids: A NumPy array of centroids obtained from K-means.
    :return: A new image with pixels assigned to the nearest centroid color.
    """
    # Flatten the image to turn it into a two-dimensional array where each row is a pixel
    flat_image = image_channel.reshape((-1, 1))
    
    # Find the nearest centroid for each pixel
    closest_centroids = pairwise_distances_argmin(flat_image, centroids)
    
    # Create a numpy array where each pixel is the color of its closest centroid
    clustered_image = centroids[closest_centroids].reshape(image_channel.shape).astype(np.uint8)
    #print("CLUSTERED IMAGE SHAPE: " + str(clustered_image.shape))
    #show_images([image_channel, clustered_image])
    
    return clustered_image.astype(np.uint8)

def find_channel_centroids(image_channel, channel_name, max_k=16):

    # scale down image_channel by a factor of 4
    # image_channel = cv2.resize(image_channel, (0,0), fx=0.25, fy=0.25)

    channel_range=255
    if channel_name == 'H':
        channel_range = 180
    
    # Flatten the image channel for clustering
    flat_image_channel = image_channel.reshape((-1, 1))
    
    # Initialize a list to store WCSS values for each number of clusters
    wcss = []
    centroids_dict = {}
    print(f"Running K-means for k = 1 - 16...")

    for i in range(1, max_k + 1):
        kmeans = KMeans(n_clusters=i, init='k-means++', max_iter=300, n_init=10, random_state=0)
        kmeans.fit(flat_image_channel)
        wcss.append(kmeans.inertia_)
        centroids_dict[i] = kmeans.cluster_centers_
    
    # Determine the elbow point using the KneeLocator
    knee_locator = KneeLocator(range(1, max_k + 1), wcss, curve='convex', direction='decreasing')
    optimal_k = knee_locator.elbow + 1
    print(f"Optimal number of clusters (k) found: {optimal_k}")
    
    # Ensure centroids are scaled appropriately
    final_centroids = np.clip(centroids_dict[optimal_k], 0, channel_range).astype(np.uint8)

    print(f"Optimal "+ str(optimal_k) +" centroids for channel "+ channel_name+": "+ str(final_centroids))
    
    # Optionally, you can return centroids for a specific k rather than the one determined by the elbow method
    return centroids_dict[optimal_k]

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
    return blur

def median_blur(image, numPixels):
     # if not uint8, normalize to 0-255 range and convert to uint8
    if image.dtype != np.uint8:
        image = normalize(image)

    # convert rgb to bgr
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    mediunBlurred = cv2.medianBlur(image, numPixels)

    return cv2.cvtColor(mediunBlurred, cv2.COLOR_BGR2RGB)


def median_blur_with_range(img, start, end, interval):
    for i in range(start, end, interval):
        img = median_blur(img, i)
    return img

def apply_median_shift_bilateral_filter(image):
    # Run mediun blur with iteratively starting from 9 pixels and going to 15, with an interval of 2.
    image = median_blur_with_range(image, 9, 15, 2)

    resized_image = cv2.resize(image, (image.shape[1] //4, image.shape[0] // 4), interpolation=cv2.INTER_AREA)

    max_rounds_of_bilateral_filter = 6
    # Running bilateral filter multiple times on the same image.
    for i in range(0, max_rounds_of_bilateral_filter):
        print("Applying bilateral blur. Round: " + str(i) + "/" + str(max_rounds_of_bilateral_filter))
        resized_image = bilateral_filter_with_variables(resized_image, -1, 25, 25)
    
    show_images([resized_image], "Median Shift Bilateral Filter", pause_to_display_images)
    return resized_image


def apply_ms_bf_xm(image):
    msbf = apply_median_shift_bilateral_filter(image)

    # convert denoised image to hsv
    msbf_hsv = cv2.cvtColor(msbf, cv2.COLOR_RGB2HSV)
    h_centroids = find_channel_centroids(msbf_hsv[:,:,0], 'H')
    s_centroids = find_channel_centroids(msbf_hsv[:,:,1], 'S')
    v_centroids = find_channel_centroids(msbf_hsv[:,:,2], 'V')

    assigned_h = assign_channel_to_centroids(msbf_hsv[:,:,0], h_centroids)
    assigned_s = assign_channel_to_centroids(msbf_hsv[:,:,1], s_centroids)
    assigned_v = assign_channel_to_centroids(msbf_hsv[:,:,2], v_centroids)

    # now merge the assigned images back to hsv
    assigned_hsv = cv2.merge([assigned_h, assigned_s, assigned_v])
    assigned_rgb = cv2.cvtColor(assigned_hsv, cv2.COLOR_HSV2RGB)
    show_images([assigned_rgb], "Centroid-Assigned RGB", pause_to_display_images)

    return assigned_rgb

###### BEGIN ######

folder_path = ''
folder_name = ''

if len(sys.argv) > 4 | len(sys.argv) <= 1:
    print("Usage: python3 process_raws.py <input_folder> <identifier> <option>")
    sys.exit(1)

folder_path = sys.argv[1]
folder_name = os.path.basename(folder_path)

for arg in sys.argv:
    if arg == '--no-show':
        pause_to_display_images = False
    if arg.startswith("identifier="):
        folder_name = arg.replace("identifier=", "")

###### GET + ALIGN IMAGES ######

get_images(folder_path, folder_name)

###### CREATE LIN POLAR COMPOSITE SOBEL ######
lin_sobel = create_sobel(lin_polar) 
lin_value = get_value(lin_polar)


###### CREATE BRIGHT COMPOSITE + SOBEL ######
if len(composite) == 0:
    print("GENERATING COMPOSITE...")
    composite = create_composite(cross_polars)
    Image.fromarray(composite).save(os.path.join(folder_path, folder_name+"_composite.jpg"))

composite_sobel = create_sobel(composite)
composite_value = get_value(composite)

###### CREATE SOBELS FROM CROSS POLARS ######


if len(sobel) == 0:
    print("GENERATING SOBEL...")
    # note these sobels havent been normalized yet
    sobels = [create_sobel(cp) for cp in cross_polars]
    values = [get_value(cp) for cp in cross_polars]
    stacked_sobels = np.stack(sobels)
    stacked_values = np.stack(values)
    #sum_composite_sobel = normalize(np.sum(stacked_sobels, axis=0)) 
    max_composite_minus_bright_sobel = normalize(np.max(stacked_sobels, axis=0)-composite_sobel) # WINNER
    #bright_minus_values = normalize(np.max(composite_value-stacked_values, axis=0))

    #xpls_minus_bright_minus_lin_sobel = normalize(np.max(stacked_sobels, axis=0)-lin_sobel) 
    #cv2.imshow('MAX - BRIGHT', max_composite_minus_bright_sobel)
    #cv2.imshow('BRIGHT - VALUES', cv2.cvtColor(bright_minus_values, cv2.COLOR_RGB2BGR))

    Image.fromarray(max_composite_minus_bright_sobel).save(os.path.join(folder_path, folder_name+"_sobel.jpg"))

# check if ms_bf_xm images array is already populated
# if len(ms_bf_xms) == 0:
#     idx = 1
#     for cp in cross_polars:
#         ms_bf_xm_img = apply_ms_bf_xm(cp)
#         ms_bf_xms.append(ms_bf_xm_img)
#         Image.fromarray(ms_bf_xm_img).save(os.path.join(folder_path, folder_name+"_msbfxm_"+str(idx)+".jpg"))
#         idx += 1

#     ms_bf_xm_img = apply_ms_bf_xm(lin_polar)
#     ms_bf_xms.append(ms_bf_xm_img)
#     Image.fromarray(ms_bf_xm_img).save(os.path.join(folder_path, folder_name+"_msbfxm_lin.jpg"))

# # now show ms_bf_xm images: ms_bf_xm is a numpy array: we need to input as list
# show_images(ms_bf_xms, 'MS_BF_XMS')

# edges = detect_edges_and_combine_for_images(ms_bf_xms)
# overlaid_image = overlay_edges_on_image(edges, np.copy(composite))

# show_images([edges, overlaid_image], "edges and overlaid image")
# show_images([mark_area_on_image_which_resemble_color_scheme(composite)], "countoured image")

# check if ms_bfs images array is already populated
if len(blurred_images) == 0:
    print("APPLYING MEDIAN SHIFT BILATERAL FILTER TO CROSS POLARS + LIN POLAR...")
    idx = 1
    for cp in cross_polars:
        ms_bf_img = apply_median_shift_bilateral_filter(cp)
        blurred_images.append(ms_bf_img)
        Image.fromarray(ms_bf_img).save(os.path.join(folder_path, folder_name+"_msbf_"+str(idx)+".jpg"))
        idx += 1

    ms_bf_img = apply_median_shift_bilateral_filter(lin_polar)
    blurred_images.append(ms_bf_img)
    Image.fromarray(ms_bf_img).save(os.path.join(folder_path, folder_name+"_msbf_lin.jpg"))
    
show_images(blurred_images, 'MS_BFS', pause_to_display_images)
print("DETECTING EDGES...")

edges = detect_edges_and_combine_for_images(blurred_images)
overlaid_image = overlay_edges_on_image(edges, np.copy(composite))

show_images([edges, overlaid_image], "edges and overlaid image", pause_to_display_images)

# upscale edges image by four times to match original image size
edges = cv2.resize(edges, (composite.shape[1], composite.shape[0]), interpolation=cv2.INTER_NEAREST)
#save edges to local
Image.fromarray(edges).save(os.path.join(folder_path, folder_name+"_edges.jpg"))
# show_images([mark_area_on_image_which_resemble_color_scheme(composite)], "countoured image")



# print("APPLYING WATERSHED (FINDING GRAIN BOUNDARIES)...")

