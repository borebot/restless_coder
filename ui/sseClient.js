import { addMessage } from './uiUtils.js';
import { speak } from './textToSpeech.js';

export function initializeSseClient() {
    if (typeof(EventSource) !== "undefined") {
        const evtSource = new EventSource("/voice-events");
        
        evtSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.displayText) {
                    addMessage(data.displayText, 'assistant-message');
                }
                if (data.speechText) {
                    speak(data.speechText);
                }
            } catch (e) {
                console.error("Error processing SSE message:", e, "Data:", event.data);
                addMessage("Received malformed message from server.", "assistant-message");
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
