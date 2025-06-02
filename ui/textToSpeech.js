import { addMessage, voiceSelect, voiceControls } from './uiUtils.js';

const speechSynthesis = window.speechSynthesis;
let voices = [];
let selectedVoiceURI = null;

function populateVoiceList() {
    console.log("[TTS] populateVoiceList called.");
    if (!speechSynthesis) {
        console.log("[TTS] speechSynthesis not available in populateVoiceList.");
        return;
    }
    voices = speechSynthesis.getVoices();
    console.log(`[TTS] Found ${voices.length} voices.`);

    if (!voiceSelect) {
        console.error("[TTS] Voice select dropdown not found for TTS setup.");
        return;
    }
    voiceSelect.innerHTML = ''; // Clear existing options
    
    voices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-lang', voice.lang);
        option.setAttribute('data-name', voice.name);
        option.value = voice.voiceURI;
        voiceSelect.appendChild(option);
    });

    if (voices.length > 0) {
        // Check if the current module-level selectedVoiceURI is still valid
        const currentSelectedVoiceIsValid = selectedVoiceURI && voices.some(v => v.voiceURI === selectedVoiceURI);

        if (currentSelectedVoiceIsValid) {
            voiceSelect.value = selectedVoiceURI; // Set dropdown to current valid selection
            console.log(`[TTS] Maintained selected voice: ${selectedVoiceURI}`);
        } else {
            // If selectedVoiceURI is null or no longer valid, pick a new default
            let defaultVoice = voices.find(voice => voice.lang.startsWith('en') && voice.default);
            if (!defaultVoice) defaultVoice = voices.find(voice => voice.lang.startsWith('en'));
            if (!defaultVoice) defaultVoice = voices[0];
            
            if (defaultVoice) {
                voiceSelect.value = defaultVoice.voiceURI;
                selectedVoiceURI = defaultVoice.voiceURI; // Update module-level selectedVoiceURI to this new default
                console.log(`[TTS] Set new default voice: ${selectedVoiceURI}`);
            } else {
                console.log("[TTS] No suitable default voice found. Clearing selection.");
                selectedVoiceURI = null; // No voices, or no suitable default
                voiceSelect.value = ''; // Clear dropdown selection
            }
        }
    } else {
        console.log("[TTS] No voices available to populate dropdown. Clearing selection.");
        selectedVoiceURI = null; // No voices, so no selection
        voiceSelect.value = ''; // Clear dropdown selection
    }
}

export function speak(textToSpeak) {
    console.log(`[TTS] speak called with text: "${textToSpeak}"`);
    if (!speechSynthesis || !textToSpeak) {
        console.log("[TTS] speechSynthesis not available or no text to speak.");
        return;
    }
    speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    if (selectedVoiceURI) {
        // Get the most current list of voices directly from the browser API at the time of speaking
        const currentBrowserVoices = speechSynthesis.getVoices();
        if (currentBrowserVoices.length === 0) {
            console.warn("[TTS] speechSynthesis.getVoices() returned an empty list at speak time. Using browser default voice. The global 'voices' array has " + voices.length + " voices.");
            // Fall through to use browser default without a specific voice object
        } else {
            const voice = currentBrowserVoices.find(v => v.voiceURI === selectedVoiceURI);
            if (voice) {
                utterance.voice = voice;
                console.log(`[TTS] Using selected voice (from fresh list): ${voice.name} (${voice.lang})`);
            } else {
                console.warn(`[TTS] Selected voice URI ${selectedVoiceURI} not found in fresh list of ${currentBrowserVoices.length} voices. Using browser default. The global 'voices' array has ${voices.length} voices.`);
            }
        }
    } else {
        console.log("[TTS] No voice selected (selectedVoiceURI is null). Using browser default.");
    }
    speechSynthesis.speak(utterance);
}

export function initializeTextToSpeech() {
    console.log("[TTS] initializeTextToSpeech called.");
    if (!speechSynthesis) {
        addMessage('Your browser does not support Speech Synthesis. Voice responses will not be available.', 'assistant-message');
        if (voiceControls) { // Use imported voiceControls
            voiceControls.style.display = 'none';
        } else {
            console.error("[TTS] UI Element not found: voiceControls, cannot hide it.");
        }
        console.log("[TTS] SpeechSynthesis not supported by this browser.");
        return;
    }

    // Initial population attempt
    populateVoiceList(); 

    // Event listener for when the list of voices changes
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            console.log("[TTS] speechSynthesis.onvoiceschanged event fired.");
            populateVoiceList();
        };
    } else {
        console.log("[TTS] speechSynthesis.onvoiceschanged event not supported. Voice list might be static or require manual refresh trigger.");
        // For some browsers, especially older ones or specific mobile ones,
        // voices might be available after a short delay without onvoiceschanged.
        // You could add a small timeout here as a fallback if needed, but it's less reliable.
        // setTimeout(populateVoiceList, 500); // Example: try again after 500ms
    }

    if (voiceSelect) {
        console.log("[TTS] voiceSelect element found. Adding change listener.");
        voiceSelect.addEventListener('change', () => {
            selectedVoiceURI = voiceSelect.value;
            console.log(`[TTS] voiceSelect changed. New selectedVoiceURI: ${selectedVoiceURI}`);
        });
    } else {
         console.error("[TTS] Voice select dropdown not found for TTS change listener setup.");
    }
}
