// Modify the clustering button in HTML to call this instead:
// <button class="toolbar-button tool" onclick="showClusteringOptions()" data-tooltip="Cluster...">


function populateImageList() {
    const container = document.getElementById('image-selection-list');
    container.innerHTML = '';
    
    Object.keys(IMAGE_LAYERS).forEach(layerKey => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `image-${layerKey}`;
        checkbox.value = layerKey;
        checkbox.checked = layerKey === ACTIVE_IMAGE_LAYER; // Check active layer by default
        
        const label = document.createElement('label');
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(layerKey));
        
        container.appendChild(label);
    });
}

// Add event listeners for the options menu
document.addEventListener('DOMContentLoaded', function() {
    // Update cluster count display
    document.getElementById('cluster-count').addEventListener('input', function(e) {
        document.getElementById('cluster-count-value').textContent = e.target.value;
    });
    
    // Update compactness display
    document.getElementById('compactness-slider').addEventListener('input', function(e) {
        document.getElementById('compactness-value').textContent = e.target.value;
    });
    
    // Submit clustering
    document.getElementById('cluster-submit').addEventListener('click', function() {
        const selectedImages = getSelectedImages();
        if (selectedImages.length === 0) {
            alert('Please select at least one image to cluster.');
            return;
        }
        
        const options = {
            selectedImages: selectedImages,
            grayscale: document.getElementById('grayscale-option').checked,
            clusterCount: parseInt(document.getElementById('cluster-count').value),
            compactness: parseFloat(document.getElementById('compactness-slider').value)
        };
        
        applyClustering(options);
    });
});

function getSelectedImages() {
    const checkboxes = document.querySelectorAll('#image-selection-list input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}



// Request image data when window loads
window.addEventListener('load', async () => {
    try {
        const [segmentationData, labelColours, imageLayers] = await Promise.all([
            window.api.invoke('get_seg_map'),
            window.api.invoke('get_label_colours'),
            window.api.invoke('get_image_layers')
        ]);

        if (imageLayers) {
            populateImageList();
        } else {
            console.error('No image data received');
        }
    } catch (error) {
        console.error('Error getting image data:', error);
    }
});