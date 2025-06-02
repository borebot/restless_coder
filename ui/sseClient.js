import { addMessage, currentProcessingSlide as processingSlideRef } from './uiUtils.js';
import { speak } from './textToSpeech.js';

export function initializeSseClient() {
    if (typeof(EventSource) !== "undefined") {
        const evtSource = new EventSource("/voice-events");
        
        evtSource.onmessage = function(event) {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.error("Error parsing SSE message JSON:", e, "Raw data:", event.data);
                // Avoid adding a UI message for a malformed JSON error here,
                // as it might be an internal or non-display message.
                // If it was critical, the server should send a proper error message.
                return; // Stop processing this malformed message
            }

            // Handle specific message types or default to display/speech
            if (data.type === "connection_established") {
                console.log("SSE connection confirmation received:", data.message);
                // Do not display this in the main message flow unless desired
                return; 
            }

            // Remove "Processing..." message if it exists, now that we have a new message from server
            if (processingSlideRef.current && processingSlideRef.current.parentElement) {
                processingSlideRef.current.remove();
                processingSlideRef.current = null;
            }

            // Process messages intended for display/speech
            let messageDisplayed = false;
            if (data.displayText) {
                addMessage(data.displayText, 'assistant-message');
                messageDisplayed = true;
            }
            if (data.speechText) {
                speak(data.speechText);
            }

            // If no relevant properties found, it might be an unexpected message type
            if (!messageDisplayed && !data.speechText && data.type !== "connection_established") {
                 console.warn("Received SSE message with no actionable content (displayText/speechText):", data);
            }
        };

        evtSource.onerror = function(err) {
            console.error("EventSource failed:", err);
            // Consider adding a message to the UI if the connection is critical for UX
            // addMessage("Connection to server for real-time responses lost. Please refresh if issues persist.", "assistant-message");
        };
    } else {
        addMessage("Your browser doesn't support Server-Sent Events. Responses from the assistant may not be received.", "assistant-message");
    }
}
