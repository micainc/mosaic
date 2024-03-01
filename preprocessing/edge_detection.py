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

def detect_edges(images):
    """
    Detect edges in each image and combine them into one image.
    
    :param images: List of images in numpy array format.
    :return: Combined edge image.
    """
    # Initialize an empty list to store edge images
    edge_images = []
    
    # Loop through each image
    for image in images:
        # Ensure the image is in grayscale
        if len(image.shape) == 3:
            image_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            image_gray = image
        
        # Detect edges using the Canny edge detector
        edges = cv2.Canny(image_gray, 100, 200)  # Adjust thresholds as needed
        
        # Append the edges to the edge_images list
        edge_images.append(edges)
    
    # Combine the edge images
    if edge_images:
        # Stack images along the third dimension and calculate the mean
        combined_edges = np.mean(np.stack(edge_images, axis=0), axis=0)
        
        # Convert the mean image to uint8 type if necessary
        combined_edges = np.uint8(combined_edges)
        
        return cv2.cvtColor(combined_edges, cv2.COLOR_GRAY2BGR)
    else:
        return None
    
def create_composite_edge_map(images):
    if len(images) == 0:
            raise TypeError("images should not be empty")
    edge_map = np.zeros_like(detect_edges([images[0]]))

        
    for img in images:
        edges = detect_edges([img])
        edge_map = cv2.bitwise_or(edge_map, edges)
    
    return edge_map

def overlay_edges_on_image(edges, image):
     # Resize combined_edges to match the target image size if necessary
    combined_edges_resized = cv2.resize(edges, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_AREA)

    # Convert combined_edges to a 3 channel image so it can be overlayed
    combined_edges_color = cv2.cvtColor(combined_edges_resized, cv2.COLOR_BGR2GRAY)

    # Create a mask where edges are present
    mask = combined_edges_color > 0

    image[mask] = [0, 255, 0]

    return image
