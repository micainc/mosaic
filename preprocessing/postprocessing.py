import numpy as np
from PIL import Image
import os
import sys
import cv2
import shutil

IMAGE_TYPES_TO_POST_PROCESS = ['lin', 'composite', 'texture', 'segmentation_map']

def replace_colors(image, colors_to_replace, target_color):
    """
    Replace specified colors in an image with the target color.

    :param image: PIL.Image object
    :param colors_to_replace: List of RGB tuples representing colors to replace
    :param target_color: RGB tuple representing the target color
    :return: PIL.Image object with colors replaced
    """
    # Convert image to a numpy array
    data = np.array(image)

    # If the image has an alpha channel, we need to consider it
    has_alpha = data.shape[-1] == 4

    # Replace specified colors with the target color
    for color in colors_to_replace:
        if has_alpha:
            # We create a mask for the RGB values only
            mask = (data[:, :, :3] == color[:3]).all(axis=-1)
            # Apply this mask to the RGB channels and set alpha to target_color alpha
            data[mask] = target_color
        else:
            data[(data == color).all(axis=-1)] = target_color

    # Convert array back to an image
    return Image.fromarray(data, mode=image.mode)



# Verify command-line arguments
if len(sys.argv) != 2:
    print("Usage: python3 postprocessing.py <input_folder>")
    sys.exit(1)

# Initialize folder path and check existence
folder_path = sys.argv[1]
if not os.path.exists(folder_path):
    print("Error: Folder does not exist.")
    sys.exit(1)

folder_name = os.path.basename(folder_path)
print("FOLDER NAME: " + folder_name)

# Find all PNG files in the folder
files = [f for f in os.listdir(folder_path) if f.endswith('.png') or f.endswith('.jpg')]

# Filter files to keep only those which contain a name from IMAGE_TYPES_TO_POST_PROCESS
filtered_files = [f for f in files if any(img_type in f for img_type in IMAGE_TYPES_TO_POST_PROCESS)]

# Check for the specific "segmentation_map" file
composite_file = None
other_images = {}

for file in filtered_files:
    if "segmentation_map" in file:
        composite_file = file
    else:
        image_path = os.path.join(folder_path, file)
        other_images[file] = Image.open(image_path)

# Ensure the composite segmentation map file exists
if composite_file is None:
    print("Error: No 'segmentation_map' file found.")
    sys.exit(1)

# Load the composite segmentation map
composite_image_path = os.path.join(folder_path, composite_file)
composite_image = Image.open(composite_image_path)

# Colors to replace with white
colors_to_replace = [(0, 0, 0, 0), (127, 127, 127, 255)]
target_color = (255, 255, 255, 255)

# Also process the composite segmentation map
composite_image = replace_colors(composite_image, colors_to_replace, target_color)

composite_array = np.array(composite_image)

# Define padding and target size
padding = 50
target_size = 256

# Check if the image has an alpha channel and remove it
if composite_array.shape[-1] == 4:
    composite_cv_image = composite_array[:, :, :3]

# Convert the image to grayscale
composite_gray = cv2.cvtColor(composite_cv_image, cv2.COLOR_RGB2GRAY)

# Prepare to find regions - you want to identify all non-white (background) pixels as foreground
foreground = np.uint8(composite_gray != 255)
num_features, labeled_array = cv2.connectedComponents(foreground, connectivity=4)

def can_merge(region1, region2, padding):
    x1_min, x1_max, y1_min, y1_max = region1
    x2_min, x2_max, y2_min, y2_max = region2
    
    # Calculate the bounding box for the combined region
    combined_min_x = min(x1_min, x2_min)
    combined_max_x = max(x1_max, x2_max)
    combined_min_y = min(y1_min, y2_min)
    combined_max_y = max(y1_max, y2_max)

    # Check if combined region fits within the dimensions with padding
    if (combined_max_x - combined_min_x <= target_size - 2 * padding and
        combined_max_y - combined_min_y <= target_size - 2 * padding):
        return True
    return False

# Calculate bounding boxes for each region
regions = []
for i in range(1, num_features + 1):
    mask = (labeled_array == i)
    if not np.any(mask):
        continue
    
    ys, xs = np.where(mask)
    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()
    regions.append((x_min, x_max, y_min, y_max))

# Merge regions where possible
merged_regions = []
while regions:
    current = regions.pop(0)
    has_merged = False
    
    for i, region in enumerate(merged_regions):
        if can_merge(current, region, padding):
            x1_min, x1_max, y1_min, y1_max = current
            x2_min, x2_max, y2_min, y2_max = region
            # Merge the current region into the existing merged region
            new_region = (min(x1_min, x2_min), max(x1_max, x2_max),
                          min(y1_min, y2_min), max(y1_max, y2_max))
            merged_regions[i] = new_region
            has_merged = True
            break
    if not has_merged:
        merged_regions.append(current)

# Create output directory
output_dir = os.path.join(folder_path, 'PostprocessOutput')
if os.path.exists(output_dir):
    # Remove the directory if it exists
    for file in os.listdir(output_dir):
        os.remove(os.path.join(output_dir, file))
    os.rmdir(output_dir)
os.makedirs(output_dir)

def crop_and_save_images(images, region, region_index, output_dir, target_size):
    x_min, x_max, y_min, y_max = region
    width = x_max - x_min
    height = y_max - y_min

    # Determine padding to center the crop if smaller than target_size
    pad_x = max(0, (target_size - width) // 2)
    pad_y = max(0, (target_size - height) // 2)

    for filename, image in images.items():
        # Adjust the crop coordinates to avoid going out of the image boundaries
        start_x = max(0, x_min - pad_x)
        end_x = min(image.width, x_max + pad_x)
        start_y = max(0, y_min - pad_y)
        end_y = min(image.height, y_max + pad_y)

        # Ensure the crop is exactly the target size
        if (end_x - start_x) < target_size:
            # Expand the end_x if there is room, or shift start_x if we are at the edge
            if end_x < image.width:
                end_x = min(image.width, start_x + target_size)
            else:
                start_x = end_x - target_size
        
        if (end_y - start_y) < target_size:
            # Expand the end_y if there is room, or shift start_y if we are at the edge
            if end_y < image.height:
                end_y = min(image.height, start_y + target_size)
            else:
                start_y = end_y - target_size

        # Crop the image
        crop = image.crop((start_x, start_y, end_x, end_y))

        # Resize if the crop is still larger than the target size (could happen in edge cases)
        if crop.width > target_size or crop.height > target_size:
            crop = crop.resize((target_size, target_size), Image.Resampling.LANCZOS)

        # Save the crop to the output directory
        output_path = os.path.join(output_dir, f"{filename[:-4]}_{region_index}.png")
        crop.save(output_path)


# Include the composite image in the list of images to process
other_images[composite_file] = Image.open(composite_image_path)

# Process each region and save crops
for index, merged_region in enumerate(merged_regions):
    crop_and_save_images(other_images, merged_region, index, output_dir, target_size)

print(f"Crops saved in directory: {output_dir}")
