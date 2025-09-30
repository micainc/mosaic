#!/usr/bin/env python3
"""
Denoise/despeckle segmentation maps by removing small clusters of a specific color.
Converts small clusters to transparent pixels.
"""

import argparse
import numpy as np
from PIL import Image
from scipy import ndimage
import os


def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def find_and_remove_small_clusters(image_array, target_color, min_size):
    """
    Find clusters of the target color and remove those smaller than min_size.

    Args:
        image_array: RGBA numpy array
        target_color: RGB tuple of the color to target
        min_size: Minimum cluster size to keep (in pixels)

    Returns:
        Modified RGBA array with small clusters made transparent
    """
    # Create a mask for pixels matching the target color (ignoring alpha)
    color_mask = np.all(image_array[:, :, :3] == target_color, axis=2)

    # Label connected components
    labeled_array, num_features = ndimage.label(color_mask)

    # Count pixels in each cluster
    cluster_sizes = np.bincount(labeled_array.ravel())

    # Identify clusters smaller than min_size (excluding background which is 0)
    small_clusters = np.where(cluster_sizes < min_size)[0]

    # Create mask for pixels to remove
    remove_mask = np.isin(labeled_array, small_clusters)

    # Make small clusters transparent
    result = image_array.copy()
    result[remove_mask, 3] = 0  # Set alpha to 0 for transparent

    # Report statistics
    clusters_removed = len(small_clusters) - (1 if 0 in small_clusters else 0)
    pixels_removed = np.sum(remove_mask)

    return result, clusters_removed, pixels_removed


def process_image(input_path, hex_color, min_size):
    """
    Process a single image to remove small clusters of the specified color.

    Args:
        input_path: Path to input image
        hex_color: Hex color string (e.g., '#FF0000')
        min_size: Minimum cluster size to keep

    Returns:
        Path to output file
    """
    # Load image and convert to RGBA if needed
    img = Image.open(input_path).convert('RGBA')
    img_array = np.array(img)

    # Convert hex to RGB
    target_color = hex_to_rgb(hex_color)

    # Process the image
    result_array, clusters_removed, pixels_removed = find_and_remove_small_clusters(
        img_array, target_color, min_size
    )

    # Create output filename
    base_name = os.path.splitext(input_path)[0]
    output_path = f"{base_name}_despeckled.png"

    # Save the result
    result_img = Image.fromarray(result_array, 'RGBA')
    result_img.save(output_path, 'PNG')

    print(f"Processed: {input_path}")
    print(f"  Target color: {hex_color} (RGB: {target_color})")
    print(f"  Minimum cluster size: {min_size} pixels")
    print(f"  Clusters removed: {clusters_removed}")
    print(f"  Pixels removed: {pixels_removed}")
    print(f"  Output saved to: {output_path}")

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description='Remove small clusters of a specific color from segmentation maps.'
    )
    parser.add_argument(
        'input',
        help='Input image file path (PNG format recommended)'
    )
    parser.add_argument(
        'color',
        help='Hex color to target for despeckling (e.g., #FF0000 or FF0000)'
    )
    parser.add_argument(
        '--min-size',
        type=int,
        default=10,
        help='Minimum cluster size to keep in pixels (default: 10)'
    )

    args = parser.parse_args()

    # Validate input file exists
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found.")
        return 1

    # Process the image
    try:
        process_image(args.input, args.color, args.min_size)
        return 0
    except Exception as e:
        print(f"Error processing image: {e}")
        return 1


if __name__ == '__main__':
    exit(main())