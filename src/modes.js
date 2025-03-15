var mode = "pencil";

function setMode(newMode, button) {
    mode = newMode;
    // Get all buttons with the 'tool' class and remove 'selected-tool' from each
    document.querySelectorAll('.tool').forEach(button => {
        button.classList.remove('selected-tool');
    });

    // Add the 'selected-tool' class to the selected button
    button.classList.add('selected-tool');
    clearSelection();
}

