import { voiceButton, addMessage, currentProcessingSlide as processingSlideRef, currentListeningSlide as listeningSlideRef } from './uiUtils.js'; // Import and alias

let listening = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let hasPrimedSpeechEngine = false; // Flag for one-time speech engine priming

async function handleTranscription(text) {
    // Display user's transcribed text
    addMessage(text, 'user-message');
    
    // Display "Processing..." message and store its reference
    // Ensure any previous processing message is cleared if somehow one exists (defensive)
    if (processingSlideRef.current && processingSlideRef.current.parentElement) {
        processingSlideRef.current.remove();
    }
    processingSlideRef.current = addMessage("Processing...", "system-message processing-indicator");
    
    // Send transcribed text to the server
    try {
        const response = await fetch('/submit-transcribed-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        // Regardless of submission outcome, the "Listening..." phase is over.
        if (listeningSlideRef.current && listeningSlideRef.current.parentElement) {
            listeningSlideRef.current.remove();
            listeningSlideRef.current = null; // Clear the reference
        }

        if (response.ok) {
            // const result = await response.json(); // Result usually {"message": "Text submitted successfully."}
            // addMessage(`Server: ${result.message}`, 'assistant-message'); // Removed as per user request
            await response.json(); // Still need to consume the response body
        } else {
            const errorResult = await response.json().catch(() => ({ error: 'Failed to submit text. Server responded with ' + response.status }));
            addMessage(`Error: ${errorResult.error || 'Failed to submit text.'}`, 'assistant-message');
            console.error('Failed to submit text:', response.status, errorResult);
        }
    } catch (error) {
        // Also remove listening message on network error
        if (listeningSlideRef.current && listeningSlideRef.current.parentElement) {
            listeningSlideRef.current.remove();
            listeningSlideRef.current = null;
        }
        addMessage(`Network Error: Could not submit text. Is the server running?`, 'assistant-message');
        console.error('Network error submitting text:', error);
    }
}

export function initializeSpeechRecognition() {
    if (!SpeechRecognition) {
        addMessage('Your browser does not support Speech Recognition. Please try Chrome or Edge.', 'assistant-message');
        if (voiceButton) voiceButton.disabled = true;
        return;
    }

    if (!recognition) {
         addMessage('Speech recognition could not be initialized.', 'assistant-message');
        if (voiceButton) voiceButton.disabled = true;
        return;
    }

    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Attempt to prime speech synthesis engine on first use to help voice list population on mobile
    const primeSpeechSynthesis = () => {
        if (!hasPrimedSpeechEngine && window.speechSynthesis) {
            console.log("[SpeechRecognition] Priming speech synthesis engine with a non-empty, silent utterance...");
            const utterance = new SpeechSynthesisUtterance(' '); // Use a single space
            utterance.volume = 0; // Make it silent
            window.speechSynthesis.speak(utterance);
            hasPrimedSpeechEngine = true;
        }
    };

    recognition.onstart = () => {
        listening = true;
        if (voiceButton) {
            voiceButton.textContent = 'Listening...';
            voiceButton.disabled = true;
        }
        // Ensure any previous listening message is cleared (defensive)
        if (listeningSlideRef.current && listeningSlideRef.current.parentElement) {
            listeningSlideRef.current.remove();
        }
        listeningSlideRef.current = addMessage('Listening...', 'assistant-message');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleTranscription(transcript);
    };

    recognition.onerror = (event) => {
        addMessage(`Speech recognition error: ${event.error}`, 'assistant-message');
        console.error('Speech recognition error:', event);
    };

    recognition.onend = () => {
        listening = false;
        if (voiceButton) {
            voiceButton.textContent = 'Start Listening';
            voiceButton.disabled = false;
        }
        // The logic to remove "Listening..." message from a specific messagesDiv is no longer applicable
        // as messages are now full slides. If a "Listening..." slide needs removal,
        // it would require a different mechanism (e.g., tracking that specific slide element).
        // For now, this cleanup is removed to fix the import error.
    };

    if (voiceButton) {
        console.log("speechRecognition.js: voiceButton found:", voiceButton); // DEBUG LOG
        voiceButton.addEventListener('click', () => {
            console.log("voiceButton clicked"); // DEBUG LOG
            if (!recognition) {
                console.error('Recognition object is null or undefined.');
                addMessage('Error: Recognition object not available.', 'assistant-message');
                return;
            }

            if (listening) {
                recognition.stop();
            } else {
                try {
                    primeSpeechSynthesis(); // Reinstated
                    recognition.start();
                } catch (e) {
                    addMessage('Could not start recognition: ' + e.message, 'assistant-message');
                    console.error("Error starting recognition:", e);
                }
            }
        });
    } else {
        console.error("Voice button not found for speech recognition setup.");
    }
}
