// DOM elements, to be initialized after DOM is loaded
export let voiceButton = null;
export let messagesDiv = null;
export let voiceSelect = null;
export let copyPrompt = null;
export let voiceControls = null; // Added for the voice controls div

// Call this function on DOMContentLoaded
export function initializeUiElements() {
    voiceButton = document.getElementById('voiceButton');
    messagesDiv = document.getElementById('messages');
    voiceSelect = document.getElementById('voiceSelect');
    copyPrompt = document.getElementById('copyPrompt');
    voiceControls = document.getElementById('voiceControls');

    if (!voiceButton) console.error("UI Element not found: voiceButton");
    if (!messagesDiv) console.error("UI Element not found: messagesDiv");
    if (!voiceSelect) console.error("UI Element not found: voiceSelect");
    if (!copyPrompt) console.error("UI Element not found: copyPrompt");
    if (!voiceControls) console.error("UI Element not found: voiceControls");
}

export function addMessage(text, className) {
    if (!messagesDiv) {
        console.error("addMessage called before messagesDiv is initialized.");
        // Fallback: try to get it now, though this shouldn't be necessary if init order is correct
        const tempMessagesDiv = document.getElementById('messages');
        if (!tempMessagesDiv) return;
        tempMessagesDiv.innerHTML += `<div class="message ${className}">${text}</div>`; // Simple fallback
        return;
    }

    const placeholder = messagesDiv.querySelector('p > em');
    if (placeholder) {
        placeholder.parentElement.remove();
    }
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    messageElement.textContent = text;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
