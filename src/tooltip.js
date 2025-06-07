let tooltipTimeout;

function initTooltip() {
    const $tooltip = $('#tooltip');
    
    // Show tooltip
    $(document).on('mouseenter', '[data-tooltip]', function(e) {
        console.log("SHOWING TOOLTIP...")
        clearTimeout(tooltipTimeout);
        
        const tooltipText = $(this).data('tooltip');
        if (!tooltipText) return;
        
        $tooltip.text(tooltipText)
                .removeClass('hidden')
                .addClass('show');
        
        updateTooltipPosition(e);
    });
    
    // Hide tooltip
    $(document).on('mouseleave', '[data-tooltip]', function() {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
            $tooltip.removeClass('show').addClass('hidden');
        }, 100);
    });
    
    // Update tooltip position on mouse move
    $(document).on('mousemove', '[data-tooltip]', function(e) {
        if ($tooltip.hasClass('show')) {
            updateTooltipPosition(e);
        }
    });
    
    function updateTooltipPosition(e) {
        const tooltipWidth = $tooltip.outerWidth();
        const tooltipHeight = $tooltip.outerHeight();
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        
        let left = e.clientX + 10;
        let top = e.clientY - tooltipHeight - 10;
        
        // Adjust if tooltip goes off screen
        if (left + tooltipWidth > windowWidth) {
            left = e.clientX - tooltipWidth - 10;
        }
        
        if (top < 0) {
            top = e.clientY + 10;
        }
        
        $tooltip.css({
            left: left + 'px',
            top: top + 'px'
        });
    }
}