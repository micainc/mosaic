import numpy as np
import cv2
from transformers import pipeline
from PIL import Image
import torch

def process_image_with_sam_model(image):
    def apply_mask_to_image(i, mask, random_color=False):
        if random_color:
            color = np.random.randint(0, 256, 3, dtype=np.uint8)
        else:
            color = np.array([127, 127, 127], dtype=np.uint8)
        color_mask = (mask.reshape(*mask.shape, 1) * color).astype(np.uint8)
        return cv2.addWeighted(i, 1, color_mask, 0.6, 0)

    # Convert CV2 image to PIL format for mask generation
    pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

    # Mask generation
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    generator = pipeline("mask-generation", model="facebook/sam-vit-huge", device=device, use_fast=True)
    outputs = generator(pil_image, points_per_batch=64)
    masks = outputs["masks"]

    # Apply masks to the original image
    for mask in masks:
        image = apply_mask_to_image(image, mask, random_color=True)

    # Get the dimensions of the original image
    height, width = image.shape[:2]

    # Create a white image of the same size
    blank_image = np.full((height, width, 3), 0, dtype=np.uint8) 

    # Apply masks to the original CV2 image
    for mask in masks:
        blank_image = apply_mask_to_image(blank_image, mask, random_color=True)

    return image, blank_image


# Below code it generate edge maps from a single image by running SAM on it over and over again.
def process_image_with_sam_model_and_return_outline(image):
    def is_mask_90_percent_black(image, mask):
        # Ensure mask is a boolean mask for indexing
        mask = mask > 0

        # Count the number of black pixels within the mask
        black_pixels = np.sum((image[mask] == [0, 0, 0]).all(axis=-1))

        # Calculate the total number of pixels in the mask
        total_pixels = np.sum(mask)

        # Calculate the percentage of black pixels
        black_percentage = (black_pixels / total_pixels) * 100 if total_pixels > 0 else 0

        return black_percentage >= 90

    def apply_black_to_masked_areas(i, mask):
        where_mask = mask > 0
        i[where_mask] = 0  # Set the masked areas to black
        return i

    def find_non_black_points(img):
        return [(x, y) for y in range(img.shape[0]) for x in range(img.shape[1]) if not all(img[y, x] == [0, 0, 0])]

    height, width = image.shape[:2]
    coverage_array = np.zeros((height, width), dtype=np.uint8)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    generator = pipeline("mask-generation", model="facebook/sam-vit-huge", device=device, use_fast=True)
    all_masks = []

    round = 1
    coverage_till_now = 0
    while np.mean(coverage_array) < 0.95:
        print("APPLYING SAM FOR MULTIPLE RUNS. RUN: " + str(round) + ", COVERAGE TILL NOW: " + str(
            np.mean(coverage_array)))
        round += 1
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        outputs = generator(pil_image, points_of_interest=find_non_black_points(image), points_per_batch=64)
        masks = outputs["masks"]
        copied_image = image.copy()

        for mask in masks:
            if not is_mask_90_percent_black(copied_image, mask):
                all_masks.append(mask)
                image = apply_black_to_masked_areas(image, mask)
                coverage_array[mask > 0] = 1  # Update coverage array

        if (np.mean(coverage_array) - coverage_till_now) < 0.01:
            break;
        coverage_till_now = np.mean(coverage_array);

    return draw_boundaries(all_masks)


def draw_boundaries(masks, max_proximity_threshold=3):
    """
    Draws boundaries of masks on a black background.
    If boundaries of two masks are close, they are merged into a single line.
    Lines become thinner towards the ends.

    :param masks: List of binary mask arrays.
    :param max_proximity_threshold: Maximum thickness of the boundary line.
    :return: Image with boundaries drawn.
    """

    if not masks:
        raise ValueError("The mask list is empty")

    # Assuming all masks are the same size, create a black canvas
    height, width = masks[0].shape
    canvas = np.zeros((height, width), dtype=np.uint8)

    # Combine and dilate edges of all masks
    combined_edges = np.zeros((height, width), dtype=np.uint8)
    for mask in masks:
        # Convert boolean mask to uint8
        mask_uint8 = mask.astype(np.uint8) * 255
        edges = cv2.Canny(mask_uint8, 100, 200)

        # Apply gradient dilation
        for i in range(1, max_proximity_threshold + 1):
            dilated_edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=i)
            combined_edges = cv2.bitwise_or(combined_edges, dilated_edges)

    # Draw the combined edges on the canvas, ensuring they are thinnest at the ends
    combined_edges = cv2.erode(combined_edges, np.ones((3, 3), np.uint8), iterations=max_proximity_threshold)
    canvas[combined_edges > 0] = 255

    return canvas

