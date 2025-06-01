import { addMessage, voiceSelect, voiceControls } from './uiUtils.js';

const speechSynthesis = window.speechSynthesis;
let voices = [];
let selectedVoiceURI = null;

function populateVoiceList() {
    if (!speechSynthesis) return;
    voices = speechSynthesis.getVoices();
    if (!voiceSelect) {
        console.error("Voice select dropdown not found for TTS setup.");
        return;
    }
    voiceSelect.innerHTML = '';
    voices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-lang', voice.lang);
        option.setAttribute('data-name', voice.name);
        option.value = voice.voiceURI;
        voiceSelect.appendChild(option);
    });
    if (voices.length > 0) {
        let defaultVoice = voices.find(voice => voice.lang.startsWith('en') && voice.default);
        if (!defaultVoice) defaultVoice = voices.find(voice => voice.lang.startsWith('en'));
        if (!defaultVoice) defaultVoice = voices[0];
        
        if (defaultVoice) {
            voiceSelect.value = defaultVoice.voiceURI;
            selectedVoiceURI = defaultVoice.voiceURI;
        }
    }
}

export function speak(textToSpeak) {
    if (!speechSynthesis || !textToSpeak) return;
    speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoiceURI) {
        const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (voice) {
            utterance.voice = voice;
        } else {
            console.warn(`Selected voice URI ${selectedVoiceURI} not found. Using default.`);
        }
    }
    speechSynthesis.speak(utterance);
}

export function initializeTextToSpeech() {
    if (!speechSynthesis) {
        addMessage('Your browser does not support Speech Synthesis. Voice responses will not be available.', 'assistant-message');
        if (voiceControls) { // Use imported voiceControls
            voiceControls.style.display = 'none';
        } else {
            console.error("UI Element not found: voiceControls, cannot hide it.");
        }
        return;
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            selectedVoiceURI = voiceSelect.value;
        });
    } else {
         console.error("Voice select dropdown not found for TTS change listener setup.");
    }
}
