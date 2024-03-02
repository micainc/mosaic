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

from edge_detection import create_composite_edge_map, overlay_edges_on_image
from contouring import mark_area_on_image_which_resemble_color_scheme

from utils import show_images, resize_images, normalize_image, get_images_with_substring, get_image_with_substring_if_exists

# install the following packages if not already installed:
#pip install git+https://github.com/facebookresearch/segment-anything.git
#https://github.com/facebookresearch/segment-anything?tab=readme-ov-file
from segment_anything_model import process_image_with_sam_model


lin_polar = None
cross_polars = []
composite = []
sobel = None
blurred_images = []
segmentation_maps = []

pause_to_display_images = True

# aligns images to the lin. if not aligned already
def get_images(folder_path, folder_name):
    global lin_polar
    global cross_polars
    global sobel
    global composite
    global segmentation_maps
    global blurred_images
    all_files = os.listdir(folder_path)

    # Get the linear-polarized image
    lin_polar = get_image_with_substring_if_exists(all_files, folder_path, 'lin')
    if lin_polar is None:
        print("NO LIN POLAR IMAGE FOUND: please label linearly polarized image with '_lin' suffix. Exiting...")
        # terminate program if no lin polar image found
        sys.exit(1)
    
    # get the composite image, if it exists
    composite_file = next((f for f in all_files if 'composite' in f and f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG'))), None)
    if composite_file:
        print("COMPOSITE IMAGE FOUND. FETCHING...")
        composite_path = os.path.join(folder_path, composite_file)
        with Image.open(composite_path) as img:
            composite = np.array(img)

    # get the sobel image, if it exists
    sobel = get_image_with_substring_if_exists(all_files, folder_path, 'sobel') 

    # Filter for non-aligned cross-polar images: ignore all processed images
    cps = [f for f in all_files if f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG')) and 'composite' not in f and 'lin' not in f and 'sobel' not in f and 'msbf' not in f and 'segmentation_map' not in f and 'segregated' not in f and 'edge_map' not in f]
    
    # For storing the cross-polarized images
    temp_dict = {}

    lin_aligned = True
    for cp in cps:
        img_path = os.path.join(folder_path, cp)
        if 'aligned' not in cp:
            print(cp + " NOT ALIGNED")
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
        lin_file = next((f for f in all_files if 'lin' in f and f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG'))), None)
        lin_img_path = os.path.join(folder_path, lin_file)
        Image.fromarray(lin_polar).save(lin_img_path)

    cross_polars = list(temp_dict.values())


    # get ms_bfs, if they exist
    blurred_images = get_images_with_substring(all_files, folder_path, 'msbf')
    #downscale blurred images by 1/4
    blurred_images = [cv2.resize(bi, (bi.shape[1] //4, bi.shape[0] // 4), interpolation=cv2.INTER_NEAREST) for bi in blurred_images]

    # get segmentation maps, if they exist
    segmentation_maps = get_images_with_substring(all_files, folder_path, 'segmentation_map')
    #downscale seg maps by 1/4
    segmentation_maps = [cv2.resize(sm, (sm.shape[1] //4, sm.shape[0] // 4), interpolation=cv2.INTER_NEAREST) for sm in segmentation_maps]

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

    sobel = np.zeros_like(channel, dtype=float)

    for scale in scales:
        resized = cv2.resize(channel, (0,0), fx=scale, fy=scale)
        sobelx = cv2.Sobel(resized, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(resized, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        magnitude = cv2.resize(magnitude, (channel.shape[1], channel.shape[0]))  # Resize back to original size
        sobel += magnitude

    return sobel

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
        image = normalize_image(image)

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
    blur = cv2.bilateralFilter(normalize_image(img), diameter, sigma_color, sigma_space)
    hsv_blur = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Apply the bilateral filter to each channel
    sat_filtered = normalize_image(cv2.bilateralFilter(hsv[:, :, 1], diameter, sigma_color, sigma_space))
    val_filtered = normalize_image(cv2.bilateralFilter(hsv[:, :, 2], diameter, sigma_color, sigma_space))

    # Merge the filtered channels back into an HSV image
    filtered_hsv = cv2.merge([hsv_blur[:, :, 0], sat_filtered, val_filtered])
    blur = cv2.cvtColor(filtered_hsv, cv2.COLOR_HSV2BGR)
    return blur

def median_blur(image, numPixels):
     # if not uint8, normalize to 0-255 range and convert to uint8
    if image.dtype != np.uint8:
        image = normalize_image(image)

    medianBlurred = cv2.medianBlur(image, numPixels)
    return medianBlurred


def median_blur_with_range(img, start, end, interval):
    # start and end must be odd numbers
    for i in range(start, end, interval):
        img = median_blur(img, i)
    return img

def apply_median_shift_bilateral_filter(image):
    image = cv2.resize(image, (image.shape[1] //4, image.shape[0] // 4), interpolation=cv2.INTER_CUBIC) # CUBIC TO SOFTEN EDGES!

    # Run median blur with iteratively starting from 9 pixels and going to 15, with an interval of 2.
    #image = median_blur_with_range(image, 5, 21, 2)
    # show_images([image], "Median Shift", pause_to_display_images)

    max_rounds_of_bilateral_filter = 5
    # Running bilateral filter multiple times on the same image.
    for i in range(0, max_rounds_of_bilateral_filter):
        print("Bilateral Blur Round: " + str(i) + "/" + str(max_rounds_of_bilateral_filter))
        image = normalize_image(median_blur_with_range(image, 1, 5, 2))
        image = normalize_image(bilateral_filter_with_variables(image, -1, 15, 15))

    show_images([cv2.cvtColor(image, cv2.COLOR_BGR2RGB)], "Median Shift Bilateral Filter", pause_to_display_images)
    return image


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
    print("Usage: python3 micas.py <input_folder> <identifier> <option>")
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
    composite = np.max(np.stack(cross_polars), axis=0)
    Image.fromarray(composite).save(os.path.join(folder_path, folder_name+"_composite.png"))

composite_sobel = create_sobel(composite)
composite_value = get_value(composite)

###### CREATE SOBEL FROM CROSS POLARS ######

if sobel is None:
    print("GENERATING SOBEL...")
    # note these sobels havent been normalized yet
    sobels = [create_sobel(cp) for cp in cross_polars]
    values = [get_value(cp) for cp in cross_polars]
    stacked_sobels = np.stack(sobels)
    stacked_values = np.stack(values)
    #sum_composite_sobel = normalize(np.sum(stacked_sobels, axis=0)) 
    max_composite_minus_bright_sobel = normalize_image(np.max(stacked_sobels, axis=0)-composite_sobel) # WINNER
    #bright_minus_values = normalize(np.max(composite_value-stacked_values, axis=0))

    #xpls_minus_bright_minus_lin_sobel = normalize(np.max(stacked_sobels, axis=0)-lin_sobel) 
    #cv2.imshow('MAX - BRIGHT', max_composite_minus_bright_sobel)
    #cv2.imshow('BRIGHT - VALUES', cv2.cvtColor(bright_minus_values, cv2.COLOR_RGB2BGR))
    sobel = max_composite_minus_bright_sobel
    Image.fromarray(max_composite_minus_bright_sobel).save(os.path.join(folder_path, folder_name+"_sobel.png"))


# # check if ms_bfs images array is already populated
# if len(blurred_images) == 0:
#     print("APPLYING MEDIAN SHIFT BILATERAL FILTER TO CROSS POLARS + LIN POLAR...")
#     idx = 1
#     for cp in cross_polars:
#         ms_bf_img = apply_median_shift_bilateral_filter(cp)
#         blurred_images.append(ms_bf_img)
#         Image.fromarray(cv2.resize(ms_bf_img, (cp.shape[1], cp.shape[0]), interpolation=cv2.INTER_NEAREST)).save(os.path.join(folder_path, folder_name+"_cross_polar_msbf_"+str(idx)+".png"))
#         idx += 1

#     ms_bf_img = apply_median_shift_bilateral_filter(lin_polar)
#     blurred_images.append(ms_bf_img)
#     Image.fromarray(cv2.resize(ms_bf_img, (lin_polar.shape[1], lin_polar.shape[0]), interpolation=cv2.INTER_NEAREST)).save(os.path.join(folder_path, folder_name+"_lin_polar_msbf.png"))
    
# show_images(blurred_images, 'MS_BFS', pause_to_display_images)


# ###### CREATE SEGMENTATION MAP FROM BLURRED IMAGES ######
# if len(segmentation_maps) == 0:
#     b_idx = 1
#     segmentation_map_overlays = []

#     for b in blurred_images:
#         print("CREATING BLUR SEGMENTION MAP "+str(b_idx)+"/"+str(len(blurred_images))+"...")
#         # downscale by 1/4
#         b_with_segmentation_map_overlay, b_segmentation_map = process_image_with_sam_model(b)
#         segmentation_maps.append(b_segmentation_map.copy())
#         segmentation_map_overlays.append(b_with_segmentation_map_overlay)

#         Image.fromarray(cv2.resize(b_segmentation_map, (lin_polar.shape[1] , lin_polar.shape[0]), interpolation=cv2.INTER_NEAREST)).save(os.path.join(folder_path, folder_name+"_blur_segmentation_map_"+str(b_idx)+".png"))
#         b_idx += 1

#     show_images(segmentation_map_overlays, "Blur Segmentation Map Overlays", pause_to_display_images)

# else:
#     show_images(segmentation_maps, "Segmentation Maps", pause_to_display_images)

# ###### CREATE EDGE MAP FROM SEGMENTATION MAPS ######

# edge_map = create_composite_edge_map(segmentation_maps)
# show_images([edge_map], "Edge Map", pause_to_display_images)
# Image.fromarray(edge_map).save(os.path.join(folder_path, folder_name+"_edge_map.png"))




# ###### CREATE SEGMENTATION MAP FROM COMPOSITE #####
# composite_with_segmentation_map_overlay, composite_segmentation_map = process_image_with_sam_model(composite)
# Image.fromarray(cv2.resize(composite_segmentation_map, (lin_polar.shape[1] , lin_polar.shape[0]), interpolation=cv2.INTER_NEAREST)).save(os.path.join(folder_path, folder_name+"_composite_segmentation_map.png"))






###### CREATE SEGMENTATION MAP FROM CROSS POLARS + LIN ######
if len(segmentation_maps) == 0:
    print("CREATING LP SEGMENTION MAP...")
    segmentation_map_overlays = []
    # downscale by 1/4
    lin_polar_with_segmentation_map_overlay, lin_polar_segmentation_map = process_image_with_sam_model(cv2.resize(lin_polar, (lin_polar.shape[1] //4, lin_polar.shape[0] // 4), interpolation=cv2.INTER_CUBIC))
    segmentation_maps.append(lin_polar_segmentation_map)
    segmentation_map_overlays.append(lin_polar_with_segmentation_map_overlay)

    Image.fromarray(cv2.resize(lin_polar_segmentation_map, (lin_polar.shape[1] , lin_polar.shape[0]), interpolation=cv2.INTER_NEAREST)).save(os.path.join(folder_path, folder_name+"_lin_polar_segmentation_map.png")) # save as png to avoid compression artifacts

    cp_idx = 1
    for cp in cross_polars:
        print("CREATING CP SEGMENTION MAP "+str(cp_idx)+"/"+str(len(cross_polars))+"...")
        # downscale by 1/4
        cp_with_segmentation_map_overlay, cp_segmentation_map = process_image_with_sam_model(cv2.resize(cp, (cp.shape[1] //4, cp.shape[0] // 4), interpolation=cv2.INTER_CUBIC))
        segmentation_maps.append(cp_segmentation_map.copy())
        segmentation_map_overlays.append(cp_with_segmentation_map_overlay)

        Image.fromarray(cv2.resize(cp_segmentation_map, (cp.shape[1] , cp.shape[0]), interpolation=cv2.INTER_NEAREST)).save(os.path.join(folder_path, folder_name+"_cross_polar_segmentation_map_"+str(cp_idx)+".png"))
        cp_idx += 1

    show_images(segmentation_map_overlays, "Segmentation Map Overlays", pause_to_display_images)

else:
    show_images(segmentation_maps, "Segmentation Maps", pause_to_display_images)

# create edge map:
edge_map = create_composite_edge_map(segmentation_maps)
Image.fromarray(cv2.resize(edge_map, (lin_polar.shape[1] , lin_polar.shape[0]), interpolation=cv2.INTER_NEAREST)).save(os.path.join(folder_path, folder_name+"_edge_map.png"))


# print("DETECTING EDGES...")

# images_to_generate_edges = blurred_images
# images_to_generate_edges.append(segmentation_maps)

# edge_map = detect_edges_and_combine_for_images(images_to_generate_edges)
# overlaid_image = overlay_edges_on_image(edge_map, np.copy(composite))

# show_images([edge_map, overlaid_image], "edges and overlaid image", pause_to_display_images)

# # upscale edges image by four times to match original image size
# edge_map = cv2.resize(edge_map, (composite.shape[1], composite.shape[0]), interpolation=cv2.INTER_NEAREST)
# #save edges to local
# Image.fromarray(edge_map).save(os.path.join(folder_path, folder_name+"_edge_map.png"))
# # show_images([mark_area_on_image_which_resemble_color_scheme(composite)], "countoured image")


