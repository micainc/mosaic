import cv2
from PIL import Image
import numpy as np
from skimage.feature import peak_local_max
from skimage.segmentation import watershed
from scipy import ndimage
import sys
import os

#https://pyimagesearch.com/2015/11/02/watershed-opencv/

def get_images(folder_path):
    # List all image files in the folder
    all_files = os.listdir(folder_path)
    image_files = [f for f in all_files if f.endswith(('.tif', '.png', '.jpg', '.jpeg', '.JPG')) 
                    and 'segmented' not in f 
                    and 'composite' not in f 
                    and 'lin' not in f 
                    and 'sobel' not in f]
    
    images = []
    for image in image_files:
        img_path = os.path.join(folder_path, image)
        with Image.open(img_path) as img:
            arr = np.array(img)
            images.append(arr)
    return images

def normalize(image):
    # if any negative values, dont lose that data - shift all values into positive, to create floor at 0.
    absolute = image
    min_val = np.min(image)

    if(min_val < 0):
        absolute = absolute + abs(min_val)
    
    min_val = np.min(absolute)
    max_val = np.max(absolute)

    normalized = ((absolute - min_val) / (max_val - min_val)) * 255
    return normalized.astype(np.uint8)

def sobel_filter_hsv(image, channel):

    # Convert the image to HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    # Extract the H, S, or V channel
    channel = hsv[:,:,channel]

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

def sobel_filter_rgb(image, channel):
    # Extract the R, G, or B channel
    channel = image[:,:,channel]

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

def bilateral_filter(image, diameter=25, sigma_color=25, sigma_space=25):
    return cv2.bilateralFilter(image, diameter, sigma_color, sigma_space)

def variance_filter(images, channel):
    # Convert each image to HSV and stack the Value channels
    value_channels = [cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, channel] for img in images]
    value_stack = np.stack(value_channels, axis=-1)
    
    # Calculate the variance across the Value channel stack
    variance_map = np.var(value_stack, axis=-1)
    
    return variance_map


def preprocess_images(images):
    print("Pre-processing "+ str(len(images))+ " images...")

    '''

        hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
        images_horiz = np.hstack((hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]))
        cv2.imshow('Preprocessed Image', blurred[0])
        print("Press any key to continue...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()        
        filtered_hsv = cv2.merge([hue, sat, val])

    '''

    # composite has the best color value

    blurs = []
    blurs_hue_stack = []
    blurs_sat_stack = []
    blurs_val_stack = []

    sobels = []

    sobel_hue_stack = []
    sobel_sat_stack = []
    sobel_val_stack = []

    print("CREATING BLURS...")
    for img in images:
        blur = bilateral_filter(normalize(img))
        hsv_blur = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Apply the bilateral filter to each channel
        sat_filtered = normalize(bilateral_filter(hsv[:, :, 1]))
        val_filtered = normalize(bilateral_filter(hsv[:, :, 2]))

        # Merge the filtered channels back into an HSV image
        filtered_hsv = cv2.merge([hsv_blur[:, :, 0], sat_filtered, val_filtered])
        blurs_hue_stack.append(hsv_blur[:, :, 0])
        blurs_sat_stack.append(sat_filtered)
        blurs_val_stack.append(val_filtered)

        blur = cv2.cvtColor(filtered_hsv, cv2.COLOR_HSV2RGB)

        cv2.imshow("BLURRED", blur)
        print("Press any key to continue...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        #Convert the HSV image back to RGB for display
        blurs.append(blur)
        
    # print("APPLYING MEAN SHIFT FILTERING...")
    # for blur in blurs:
    #     mean_shifted = cv2.pyrMeanShiftFiltering(blur, sp=30, sr=30, maxLevel=1)
    #     cv2.imshow("MEAN SHIFTED", mean_shifted)
    #     print("Press any key to continue...")
    #     cv2.waitKey(0)
    #     cv2.destroyAllWindows()
    
    # # create composite HUE
    # mean = normalize(np.mean(blurs, axis=0))
    # blur_hue = cv2.cvtColor(mean, cv2.COLOR_RGB2HSV)[:, :, 0]
    # cv2.imshow("BLUR HUE", normalize(blur_hue)) # show between 0, 255 instead of 0, 100
    # blur_hue_2 = cv2.merge([blur_hue, 255*np.ones_like(blur_hue), 255*(np.ones_like(blur_hue))])
    # blur_hue_2_rgb = cv2.cvtColor(blur_hue_2, cv2.COLOR_HSV2RGB)

    # cv2.imshow("BLUR HUE 2", blur_hue_2_rgb) # show between 0, 255 instead of 0, 100
    # print("Press any key to continue...")
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()

    #for blur in blurs:


    # print("CREATING SOBELS...")
    # for blur in blurs:
    #     sobel_hue = sobel_filter_hsv(blur, 0)
    #     # sobel_sat = normalize(sobel_filter_hsv(blur, 1))
    #     sobel_val = sobel_filter_hsv(blur, 2)
    #     # sobels.append(cv2.merge([sobel_hue, sobel_sat, sobel_val]))
    #     sobel_hue_stack.append(sobel_hue)
    #     # sobel_sat_stack.append(sobel_sat)
    #     sobel_val_stack.append(sobel_val)
    #     # sobel_combined = normalize(np.sum(np.stack((sobel_hue, sobel_sat, sobel_val), axis=-1), axis=-1))

    #     # cv2.imshow("SOBEL HSV ADDITIVE", sobel_combined)
    #     # print("Press any key to continue...")
    #     # cv2.waitKey(0)
    #     # cv2.destroyAllWindows()

    # cv2.imshow("HUE SOBELS MAX", normalize(np.max(sobel_hue_stack, axis=0)))
    # # cv2.imshow("SAT SOBELS MAX", normalize(np.max(sobel_sat_stack, axis=0)))
    # cv2.imshow("VAL SOBELS MAX", normalize(np.max(sobel_val_stack, axis=0)))

    #cv2.imshow("BLUR HUE VAR", normalize(np.sum(blurs_hue_stack, axis=0)))
    #cv2.imshow("BLUR SAT VAR", normalize(np.var(blurs_sat_stack, axis=0)))
    #cv2.imshow("BLUR VAL VAR", normalize(np.var(blurs_val_stack, axis=0)))

    # print("Press any key to continue...")
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()


    preprocessed = normalize(np.var(blurs, axis=0))
    return preprocessed

def process_watershed(image):
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply thresholding
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Generate markers
    distance = ndimage.distance_transform_edt(thresh)
    local_maxi = peak_local_max(distance, footprint=np.ones((3, 3)), labels=thresh)


    # Create markers array
    markers = np.zeros_like(distance, dtype=int)
    height, width = markers.shape

    # Find indices of local maxima and transpose to get list of coordinates
    local_maxi_coords = np.transpose(np.where(local_maxi))

    # Assign labels to the markers array using coordinates
    for i, (y, x) in enumerate(local_maxi_coords):
        if y < height and x < width:
            markers[y, x] = i + 1

    # Apply Watershed
    segments = watershed(-distance, markers, mask=thresh)

    # Overlay segments on the original image
    segmented_image = image.copy()
    for label in np.unique(segments):
        if label == 0:
            continue
        mask = np.zeros(gray.shape, dtype="uint8")
        mask[segments == label] = 255
        cnts, _ = cv2.findContours(mask.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(segmented_image, cnts, -1, (0, 255, 0), 2)
    
    return segmented_image


def main(folder_path):
    images = get_images(folder_path)
    preprocessed = preprocess_images(images)

    # Display the preprocessed image
    cv2.imshow('Preprocessed Image: ', preprocessed)
    print("Press any key to continue...")
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    # # Proceed with Watershed algorithm
    # segmented = process_watershed(preprocessed)

    # # Save or display the result
    # cv2.imwrite('segmented_image.jpg', segmented)
    # cv2.imshow('Segmented Image', segmented)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 watershed.py <input_folder>")
        sys.exit(1)
    folder_path = sys.argv[1]
    main(folder_path)
