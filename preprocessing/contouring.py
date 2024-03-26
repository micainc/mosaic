import time
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

selected_coordinates = []

def mouse_callback(event, x, y, flags, param):
    # Capture mouse clicks
    if event == cv2.EVENT_LBUTTONDOWN:
        selected_coordinates.clear()
        selected_coordinates.append((x, y))
        print(selected_coordinates)

def find_similar_color_areas_from_image(image, x1, y1, sample_size=10, error_margin=5):
    sample = image[y1:y1+sample_size, x1:x1+sample_size, :]

    # Take a sample from the right top
    #sample = image[:sample_size, -sample_size:, :]

    # Calculate the color distribution in the sample
    sample_color_distribution = np.sum(sample, axis=(0, 1)) / (sample_size ** 2)

    # Calculate the error margin for each color channel
    error = sample_color_distribution * (error_margin / 100)

    # Define color ranges for searching similar areas
    lower_bound = np.clip(sample_color_distribution - error, 0, 255).astype(np.uint8)
    upper_bound = np.clip(sample_color_distribution + error, 0, 255).astype(np.uint8)

    # Create a mask for the specified color range
    color_mask = cv2.inRange(image, lower_bound, upper_bound)

    # Find contours of connected components in the mask
    contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    return contours

def mark_area_on_image_which_resemble_color_scheme(image):
    cv2.imshow('Select Sample Region to perform countouring from..', image)
    cv2.setMouseCallback('Select Sample Region to perform countouring from..', mouse_callback)

    while len(selected_coordinates) == 0:
        cv2.waitKey(1)  # Add this line to update the window
        time.sleep(0.1)  # Sleep for a short time to avoid high CPU usage

    cv2.destroyAllWindows() 

    if len(selected_coordinates) > 0:
        x1, y1 = selected_coordinates[0]
    else:    
        print("using coordinates (0, 0) since mouse was not clicked on the image")
        x1, y1 = (0, 0)

    print("x = " + str(x1) + "y = " + str(y1))

    countours = []
    for i in range(20, 100, 10):
        for c in find_similar_color_areas_from_image(image, x1, y1, i):
            countours.append(c)

    
     # Draw rectangles around the areas with similar colors
    result_image = image.copy()
    for contour in countours:
        x, y, w, h = cv2.boundingRect(contour)
        cv2.rectangle(result_image, (x, y), (x + w, y + h), (0, 255, 0), 2)

    return result_image