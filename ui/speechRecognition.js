import { voiceButton, addMessage, messagesDiv } from './uiUtils.js';

let listening = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

async function handleTranscription(text) {
    // Display user's transcribed text
    addMessage(`You said: "${text}"`, 'user-message');
    
    // Send transcribed text to the server
    try {
        const response = await fetch('http://localhost:6543/submit-transcribed-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });
        if (response.ok) {
            const result = await response.json();
            addMessage(`Server: ${result.message}`, 'assistant-message');
        } else {
            const errorResult = await response.json().catch(() => ({ error: 'Failed to submit text. Server responded with ' + response.status }));
            addMessage(`Error: ${errorResult.error || 'Failed to submit text.'}`, 'assistant-message');
            console.error('Failed to submit text:', response.status, errorResult);
        }
    } catch (error) {
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

    recognition.onstart = () => {
        listening = true;
        if (voiceButton) {
            voiceButton.textContent = 'Listening...';
            voiceButton.disabled = true;
        }
        addMessage('Listening...', 'assistant-message');
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
        // Remove "Listening..." message if it's the last one
        if (messagesDiv) { // Use imported messagesDiv
            const lastMessage = messagesDiv.lastChild;
             if (lastMessage && lastMessage.textContent === 'Listening...' && lastMessage.classList.contains('assistant-message')) {
                lastMessage.remove();
            }
        }
    };

    if (voiceButton) {
        voiceButton.addEventListener('click', () => {
            if (!recognition) {
                console.error('Recognition object is null or undefined.');
                addMessage('Error: Recognition object not available.', 'assistant-message');
                return;
            }

            if (listening) {
                recognition.stop();
            } else {
                try {
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
