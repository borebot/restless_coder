// DOM elements, to be initialized after DOM is loaded
export let voiceButton = null;
export let voiceSelect = null;
export let copyPrompt = null;
export let voiceControls = null;
export let fullpageSlidesDiv = null;
export let initialSlide = null; // To handle removing it
export let currentProcessingSlide = { current: null }; // Changed to an object with a 'current' property
export let currentListeningSlide = { current: null }; // For the "Listening..." message

// Call this function on DOMContentLoaded
export function initializeUiElements() {
    voiceButton = document.getElementById('voiceButton');
    voiceSelect = document.getElementById('voiceSelect');
    copyPrompt = document.getElementById('copyPrompt');
    voiceControls = document.getElementById('voiceControls');
    fullpageSlidesDiv = document.getElementById('fullpage-slides');
    initialSlide = document.getElementById('initial-slide');


    if (!voiceButton) console.error("UI Element not found: voiceButton");
    if (!voiceSelect) console.error("UI Element not found: voiceSelect");
    if (!copyPrompt) console.error("UI Element not found: copyPrompt");
    if (!voiceControls) console.error("UI Element not found: voiceControls");
    if (!fullpageSlidesDiv) console.error("UI Element not found: fullpageSlidesDiv");
    // initialSlide is optional, so no error if not found initially (though it's in HTML)

    // Resize listener for currently visible slide (if needed, more complex with IntersectionObserver)
    // For now, font adjustment happens on slide creation.
    // A more robust resize handler would find the currently "active" slide and readjust.
}

const MIN_FONT_SIZE = 16; // pixels, increased for better readability on full slides
const MAX_FONT_SIZE = 100; // pixels

export function adjustFontSizeToFit(slideContentElement, text) {
    if (!slideContentElement || !text || !slideContentElement.parentElement) {
        console.warn("adjustFontSizeToFit: Missing element, text, or parent.");
        return;
    }

    // The slideContentElement itself has a width (e.g., 85% of slide).
    // We want the text to fill about 80% of this slideContentElement's width.
    const availableWidth = slideContentElement.clientWidth * 0.80;
    if (availableWidth <= 0) { // If clientWidth is 0 (e.g. display:none)
        console.warn("adjustFontSizeToFit: availableWidth is 0 or negative.");
        slideContentElement.style.fontSize = MIN_FONT_SIZE + 'px'; // Set to min and return
        return;
    }


    slideContentElement.textContent = text; // Set text first to measure
    let currentFontSize = MAX_FONT_SIZE;
    slideContentElement.style.fontSize = currentFontSize + 'px';

    // Decrease font size until it fits, or hits min font size
    // Add a counter to prevent infinite loops in weird edge cases
    let attempts = 0;
    const maxAttempts = MAX_FONT_SIZE - MIN_FONT_SIZE + 1;

    while (slideContentElement.scrollWidth > availableWidth && currentFontSize > MIN_FONT_SIZE && attempts < maxAttempts) {
        currentFontSize--;
        slideContentElement.style.fontSize = currentFontSize + 'px';
        attempts++;
    }
     if (attempts >= maxAttempts) {
        console.warn("adjustFontSizeToFit: Max attempts reached in font size adjustment loop.");
    }


    // Ensure it's not smaller than min
    if (currentFontSize < MIN_FONT_SIZE) {
        slideContentElement.style.fontSize = MIN_FONT_SIZE + 'px';
    }
    // console.log(`Adjusted font size to: ${slideContentElement.style.fontSize} for text: "${text.substring(0,20)}..."`);
}


export function addMessage(text, className) {
    if (!fullpageSlidesDiv) {
        console.error("addMessage called before fullpageSlidesDiv is initialized.");
        return null;
    }

    // Remove initial placeholder slide if it exists and this is the first "real" message
    if (initialSlide && initialSlide.parentElement === fullpageSlidesDiv) {
        initialSlide.remove();
        initialSlide = null; // Ensure it's only removed once
    }

    const slideElement = document.createElement('section');
    slideElement.classList.add('slide');
    if (className.includes('user-message')) {
        slideElement.classList.add('user-message');
    } else if (className.includes('assistant-message')) {
        slideElement.classList.add('assistant-message');
    } else if (className.includes('processing-indicator')) {
        slideElement.classList.add('system-message'); // Or a specific style for processing
        slideElement.classList.add('processing-indicator');
    } else { // Default to system-message if not user or assistant
        slideElement.classList.add('system-message');
    }

    const slideContentElement = document.createElement('div');
    slideContentElement.classList.add('slide-content');
    
    // Wrap each character in a span for animation
    slideContentElement.innerHTML = text.split('').map(char => {
        // Preserve spaces as actual spaces, not empty spans that might collapse
        if (char === ' ') {
            return ' '; 
        }
        // Wrap non-space characters in spans with initial opacity 0
        return `<span style="opacity: 0;">${char}</span>`;
    }).join('');
    
    // Font size adjustment is less critical with character-by-character, 
    // but we'll keep it for overall block sizing if needed.
    // It might need to be rethought if text wrapping with spans behaves differently.
    // For now, we'll adjust based on the plain text content before spans were added.
    
    slideElement.appendChild(slideContentElement);

    // Prepend to DOM so clientWidth is available and new messages appear at the top
    if (fullpageSlidesDiv.firstChild) {
        fullpageSlidesDiv.insertBefore(slideElement, fullpageSlidesDiv.firstChild);
    } else {
        fullpageSlidesDiv.appendChild(slideElement);
    }

    // adjustFontSizeToFit(slideContentElement, text); // Removed as it interferes with character span animation by resetting textContent

    // Scroll to the top of the container after adding the new message
    fullpageSlidesDiv.scrollTop = 0;

    // The IntersectionObserver in index.html will handle the animation.
    // We return the slideElement so index.html can scroll to it.
    return slideElement;
}
