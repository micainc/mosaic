import os
import numpy as np
import cv2
from PIL import Image

def show_images(images, title="Image Grid", pause_to_display_images=True, max_width=3):
    """
    Shows images in a wxh grid, where the max width is 3.
    
    Parameters:
    - images: List of images to show.
    - title: Window title.
    - max_width: Maximum number of images in a row.
    - pause_to_display_images: Flag to wait for key press before closing images.
    """
    images = resize_images(images)    

    # Only pad with dummy images if the number of images is greater than max_width
    needs_padding = len(images) > max_width
    
    # Calculate the number of rows needed to display the images
    num_rows = len(images) // max_width + (len(images) % max_width > 0)

    # Prepare a dummy (blank) image of the same shape and type as the first image if padding is needed
    if needs_padding and images:
        dummy_shape = images[0].shape
        dummy_image = np.zeros(dummy_shape, dtype=images[0].dtype)

    # Create the horizontal stacks for each row
    rows = []
    for i in range(num_rows):
        row_images = images[i * max_width:(i + 1) * max_width]

        # If this row is not fully populated and padding is needed, pad it with dummy images
        if needs_padding:
            while len(row_images) < max_width:
                row_images.append(dummy_image)

        row_stack = np.hstack(row_images)
        rows.append(row_stack)

    # Stack rows vertically
    if rows:
        vstack = np.vstack(rows)

        if pause_to_display_images:
            # Display the images
            cv2.imshow(title, vstack)
            print("Displaying '" + title + "'" + ": press a key to advance...")
            cv2.waitKey(0)  # Wait until a key is pressed

            cv2.destroyAllWindows()  # Close the window

    else:
        print("No images to display.")

def normalize_image(image):

    # if any negative values, dont lose that data: shift all values into positive, to create floor at 0.
    absolute = image
    min_val = np.min(image)

    if(min_val < 0):
        absolute = absolute + abs(min_val)
    
    min_val = np.min(absolute)
    max_val = np.max(absolute)

    normalized = ((absolute - min_val) / (max_val - min_val)) * 255
    return normalized.astype(np.uint8)

def resize_images(images, ref_image=None):
    if not images:
        return []

    if not ref_image:
            
        # Get the size of the first image
        output_size = images[0].shape[1], images[0].shape[0]

        resized_images = []

        for img in images:
            # Resize the image
            resized_img = cv2.resize(img, output_size)

            # Append the resized image to the list
            resized_images.append(resized_img)

        return resized_images
    else:
        output_size = ref_image.shape[1], ref_image.shape[0]

        resized_images = []

        for img in images:
            # Resize the image
            resized_img = cv2.resize(img, output_size)

            # Append the resized image to the list
            resized_images.append(resized_img)

        return resized_images
    
def get_images_with_substring(file_paths, folder_path, substring_to_match):
    # get ms_bfs images, if they exist
    images = []
    ms_bf_files = [f for f in file_paths if f.endswith(('.tif', '.png', 'jpg', '.jpeg', '.JPG')) and substring_to_match in f]
    if(len(ms_bf_files) > 0):
        print(substring_to_match + " IMAGES FOUND. FETCHING...")
    for file in ms_bf_files:
        path = os.path.join(folder_path, file)
        with Image.open(path) as img:
            arr = np.array(img)
            images.append(arr)
    return images

def get_image_with_substring_if_exists(file_paths, folder_path, substring_to_match):
    images = get_images_with_substring(file_paths, folder_path, substring_to_match)

    if images:
        return images[0]
    else:
        # print uppercase
        print(substring_to_match.upper() + " NOT FOUND.")
        return None
    
    
def save_image_as_jpg(img_array, old_img_path, new_img_path):
    """
    Saves the image array as a JPG file with the highest quality.
    If the original image is a PNG, it ensures conversion to JPG.
    
    :param img_array: Numpy array of the image to be saved
    :param old_img_path: Path of the old image to be replaced
    :param new_img_path: New file path for saving the image
    """
    # Save the image as JPG with highest quality
    jpg = Image.fromarray(img_array).convert('RGB')
    jpg.save(new_img_path, 'JPEG', quality=100)
    # Remove the old image file if it's different from the new file
    if old_img_path != new_img_path:
        os.remove(old_img_path)
    return jpg