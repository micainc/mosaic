// Import jQuery and jQuery UI
import $ from 'jquery';
import 'jquery-ui/ui/widgets/slider'; // Import specific jQuery UI components if needed

// Import your custom scripts
import './index.js';
import './selector.js';
import './rgb-utils.js';
import './modes.js';
import './classifier.js';

// Optionally, import your CSS
import './index.css';

// Your code that uses jQuery
$(document).ready(function() {
  init();
});