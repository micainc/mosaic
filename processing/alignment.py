
import cv2
import numpy as np
import matplotlib.pyplot as plt

def align_images(img, reference, blend_width=0, use_grayscale=False):
    """
    Aligns images using phase correlation and blends the boundaries.
    Uses either grayscale or all color channels for alignment.
    
    Args:
    img (numpy.ndarray): Image to be aligned.
    reference (numpy.ndarray): Reference image to align to.
    blend_width (int): Width of the blending border. Default is 0 (no blending).
    use_grayscale (bool): If True, uses grayscale for alignment. If False, uses all color channels.
    
    Returns:
    numpy.ndarray: Aligned and optionally blended image.
    """

    # Ensure the images are in the same orientation
    if img.shape != reference.shape:
        img = np.transpose(img, (1, 0, 2))

    if use_grayscale:
        # Convert images to grayscale
        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        ref_gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
        dft_ref = np.fft.fft2(ref_gray)
        dft_img = np.fft.fft2(img_gray)
    else:
        # Use all color channels
        dft_ref = np.fft.fft2(reference, axes=(0, 1))
        dft_img = np.fft.fft2(img, axes=(0, 1))

    # Compute the cross-power spectrum
    cross_power_spectrum = dft_ref * np.conj(dft_img)
    
    # Compute the inverse Fourier transform of the normalized cross-power spectrum
    r0 = np.fft.ifftn(cross_power_spectrum / (np.abs(cross_power_spectrum) + 1e-5))
    
    # Find the location of the maximum in r0, which corresponds to the shift
    shift = np.unravel_index(np.argmax(np.abs(r0)), r0.shape)
    
    # Convert the shift to a form suitable for np.roll
    shift = tuple((s if s < r0.shape[i] // 2 else s - r0.shape[i]) for i, s in enumerate(shift))
    
    # Apply the shift to align the image
    aligned = np.roll(img, shift[:2], axis=(0,1))
    
    if blend_width > 0:
        # Create a linear gradient mask
        rows, cols, _ = aligned.shape
        mask = np.ones((rows, cols))

        mask[:blend_width] = np.linspace(0, 1, blend_width)[:, None]
        mask[-blend_width:] = np.linspace(1, 0, blend_width)[:, None]
        mask[:, :blend_width] *= np.linspace(0, 1, blend_width)
        mask[:, -blend_width:] *= np.linspace(1, 0, blend_width)

        # Blend using the mask
        blended = aligned * mask[:,:,None] + img * (1 - mask[:,:,None])
    else:
        blended = aligned
    
    return blended.astype(np.uint8)