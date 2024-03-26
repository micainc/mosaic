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

