// API Base URL
const API_BASE_URL = 'http://localhost:5000';

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadStatus = document.getElementById('uploadStatus');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const loadingOverlay = document.getElementById('loadingOverlay');
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');
const voiceStatusText = document.getElementById('voiceStatusText');
const autoSpeakToggle = document.getElementById('autoSpeakToggle');

// Voice Recognition Setup
let recognition = null;
let isRecording = false;
let speechSynthesis = window.speechSynthesis;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let analyser = null;
let microphone = null;
let javascriptNode = null;
let voiceActivityTimeout = null;
let silenceThreshold = 0.01;
let silenceDuration = 2000; // 2 seconds of silence to stop recording

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isRecording = true;
        voiceBtn.classList.add('recording');
        voiceStatus.classList.add('active');
        voiceStatusText.textContent = 'Listening...';
        questionInput.placeholder = 'Speak now...';
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
                // Reset voice activity timeout on final result
                resetVoiceActivityTimeout();
            } else {
                interimTranscript += transcript;
            }
        }

        // Show interim results
        if (interimTranscript) {
            voiceStatusText.textContent = `"${interimTranscript}"`;
            // Update input field with interim results for better UX
            questionInput.value = questionInput.value + interimTranscript.replace(questionInput.value, '');
        }

        // Use final results
        if (finalTranscript) {
            questionInput.value = finalTranscript;
            voiceStatusText.textContent = 'Processing...';
            // Auto-stop recording after getting a final result
            setTimeout(() => {
                if (isRecording) {
                    recognition.stop();
                }
            }, 1000);
        }
    };

    recognition.onend = () => {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceStatus.classList.remove('active');
        questionInput.placeholder = 'Type or click microphone to speak...';

        // Auto-send if we got a transcript
        if (questionInput.value.trim()) {
            setTimeout(() => sendQuestion(), 500);
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceStatus.classList.remove('active');
        questionInput.placeholder = 'Type or click microphone to speak...';
        cleanupAudioContext();

        let errorMessage = 'Voice recognition failed.';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try speaking clearly.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
                showMicrophonePermissionHelp();
                break;
            case 'network':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service is not available. Please try again later.';
                break;
            default:
                errorMessage = `Voice recognition error: ${event.error}`;
        }
        
        voiceStatusText.textContent = errorMessage;
        addMessage('bot', errorMessage);
        speak(errorMessage);
    };
} else {
    console.warn('Speech recognition not supported in this browser');
    if (voiceBtn) {
        voiceBtn.disabled = true;
        voiceBtn.title = 'Speech recognition not supported in this browser';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadChatHistory();
    checkBrowserSupport();
});

// Setup Event Listeners
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => fileInput.click());

    // Question input
    questionInput.addEventListener('keypress', handleKeyPress);
}

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle File Upload
async function handleFile(file) {
    // Validate file type
    const validTypes = ['.pdf', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(fileExtension)) {
        showUploadStatus('error', 'Invalid file type. Please upload PDF or TXT files only.');
        return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showUploadStatus('error', 'File is too large. Maximum size is 10MB.');
        return;
    }

    // Show loading status
    showUploadStatus('loading', `Uploading ${file.name}...`);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showUploadStatus('success', `✓ ${file.name} uploaded successfully! You can now ask questions about it.`);
            // Clear file input
            fileInput.value = '';

            // Remove welcome message if exists
            const welcomeMsg = document.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.remove();
            }
        } else {
            showUploadStatus('error', `✗ Upload failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('error', '✗ Upload failed. Please check your connection and try again.');
    }
}

function showUploadStatus(type, message) {
    uploadStatus.className = `upload-status ${type}`;

    if (type === 'loading') {
        uploadStatus.innerHTML = `
            <div class="spinner" style="width: 20px; height: 20px; border-width: 3px;"></div>
            <span>${message}</span>
        `;
    } else {
        uploadStatus.textContent = message;
    }

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            uploadStatus.style.display = 'none';
        }, 5000);
    }
}

// Handle Key Press in Question Input
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendQuestion();
    }
}

// Send Question
async function sendQuestion() {
    const question = questionInput.value.trim();

    if (!question) {
        return;
    }

    // Disable input while processing
    questionInput.disabled = true;
    sendBtn.disabled = true;

    // Add user message to chat
    addMessage('user', question);

    // Clear input
    questionInput.value = '';

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        if (response.ok) {
            const answer = data.answer || 'No answer received.';
            // Add bot response to chat
            addMessage('bot', answer);
            // Speak the response if auto-speak is enabled
            speak(answer);
        } else {
            const errorMsg = `Error: ${data.error || 'Failed to get answer. Please try again.'}`;
            addMessage('bot', errorMsg);
            speak(errorMsg);
        }
    } catch (error) {
        console.error('Question error:', error);
        removeTypingIndicator(typingId);
        const errorMsg = 'Failed to connect to server. Please check your connection and try again.';
        addMessage('bot', errorMsg);
        speak(errorMsg);
    } finally {
        // Re-enable input
        questionInput.disabled = false;
        sendBtn.disabled = false;
        questionInput.focus();
    }

    // Save chat history
    saveChatHistory();
}

// Add Message to Chat
function addMessage(sender, text) {
    // Remove welcome message if exists
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';

    // Format the text (preserve line breaks)
    const formattedText = text.replace(/\n/g, '<br>');
    content.innerHTML = `
        <div>${formattedText}</div>
        <div class="message-time">${getCurrentTime()}</div>
    `;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add Typing Indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return 'typing-indicator';
}

// Remove Typing Indicator
function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

// Get Current Time
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Save Chat History to LocalStorage
function saveChatHistory() {
    const messages = [];
    const messageElements = chatMessages.querySelectorAll('.message:not(#typing-indicator)');

    messageElements.forEach(msg => {
        const sender = msg.classList.contains('user') ? 'user' : 'bot';
        const text = msg.querySelector('.message-content > div').textContent;
        messages.push({ sender, text });
    });

    localStorage.setItem('chatHistory', JSON.stringify(messages));
}

// Load Chat History from LocalStorage
function loadChatHistory() {
    const history = localStorage.getItem('chatHistory');

    if (history) {
        try {
            const messages = JSON.parse(history);

            if (messages.length > 0) {
                // Remove welcome message
                const welcomeMsg = document.querySelector('.welcome-message');
                if (welcomeMsg) {
                    welcomeMsg.remove();
                }

                // Add messages
                messages.forEach(msg => {
                    addMessage(msg.sender, msg.text);
                });
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }
}

// Clear Chat History
function clearChatHistory() {
    localStorage.removeItem('chatHistory');
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <i class="fas fa-robot"></i>
            <p>Welcome! Upload a document and start asking questions.</p>
        </div>
    `;
}

// Show Loading Overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide Loading Overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Add clear chat button functionality (optional)
function addClearChatButton() {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-secondary';
    clearBtn.innerHTML = '<i class="fas fa-trash"></i> Clear Chat';
    clearBtn.onclick = () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
            clearChatHistory();
        }
    };

    // You can add this button to the chat header if needed
    return clearBtn;
}

// ============== VOICE INTERFACE FUNCTIONS ==============

// Voice Activity Detection Setup
async function setupVoiceActivityDetection() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        javascriptNode.onaudioprocess = function() {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            const values = array.reduce((a, b) => a + b, 0);
            const average = values / array.length;
            const normalizedAverage = average / 255;

            if (isRecording && normalizedAverage > silenceThreshold) {
                resetVoiceActivityTimeout();
            }
        };

        return stream;
    } catch (error) {
        console.error('Error setting up voice activity detection:', error);
        return null;
    }
}

// Reset voice activity timeout
function resetVoiceActivityTimeout() {
    if (voiceActivityTimeout) {
        clearTimeout(voiceActivityTimeout);
    }
    
    voiceActivityTimeout = setTimeout(() => {
        if (isRecording && recognition) {
            voiceStatusText.textContent = 'Silence detected, stopping...';
            recognition.stop();
        }
    }, silenceDuration);
}

// Cleanup audio context
function cleanupAudioContext() {
    if (voiceActivityTimeout) {
        clearTimeout(voiceActivityTimeout);
    }
    
    if (javascriptNode) {
        javascriptNode.disconnect();
        javascriptNode = null;
    }
    
    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }
    
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

// Show microphone permission help
function showMicrophonePermissionHelp() {
    const helpMessage = `
🎤 **Microphone Access Required**

**Chrome/Edge:**
1. Click the 📍 lock icon in the address bar (left side)
2. Find "Microphone" in the permissions list
3. Change from "Block" to "Allow"
4. Refresh the page and try again

**Firefox:**
1. Click the 📍 lock icon in the address bar
2. Find "Use the microphone" and set to "Allow"
3. Refresh the page

**Safari:**
1. Click "Settings" in the address bar
2. Find "Microphone" and set to "Allow"
3. Refresh the page

**Alternative:**
- Copy the URL and open in a new tab
- Or try incognito/private mode
    `;
    addMessage('bot', helpMessage.trim());
}

// Request microphone permission with better user guidance
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Microphone permission error:', error);
        return false;
    }
}

// Toggle Voice Recording with enhanced features
async function toggleVoiceRecording() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
        return;
    }

    if (isRecording) {
        recognition.stop();
        cleanupAudioContext();
    } else {
        try {
            // First check/request microphone permission
            const hasPermission = await requestMicrophonePermission();
            if (!hasPermission) {
                showMicrophonePermissionHelp();
                return;
            }
            
            // Setup voice activity detection first
            await setupVoiceActivityDetection();
            
            // Clear any previous input
            questionInput.value = '';
            
            // Start recognition
            recognition.start();
            
            voiceStatusText.textContent = 'Listening... Speak clearly';
            addVoiceFeedback('Microphone ready! Start speaking.', 'success');
        } catch (error) {
            console.error('Error starting recognition:', error);
            
            if (error.name === 'NotAllowedError') {
                showMicrophonePermissionHelp();
                addMessage('bot', '🎤 **Microphone access was denied.** Please follow the steps above to enable microphone access, then refresh the page.');
            } else if (error.name === 'NotFoundError') {
                addMessage('bot', '🎤 **No microphone found.** Please connect a microphone and try again.');
            } else {
                addMessage('bot', '🎤 **Failed to start voice recognition.** Please try again.');
            }
        }
    }
}

// Enhanced Text-to-Speech for AI responses
function speak(text) {
    // Check if auto-speak is enabled
    if (!autoSpeakToggle || !autoSpeakToggle.checked) {
        console.log('TTS is disabled');
        return;
    }

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
        console.log('Speech synthesis not supported');
        addMessage('bot', '🔊 Text-to-speech is not supported in your browser.');
        return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Create speech utterance with enhanced settings
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Force load voices if not loaded
    let voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
        speechSynthesis.getVoices();
        voices = speechSynthesis.getVoices();
    }

    // Try to use a natural sounding female voice
    const preferredVoices = [
        'Google US English Female',
        'Samantha',
        'Karen',
        'Moira',
        'Tessa',
        'Microsoft Zira Desktop',
        'Microsoft David Desktop',
        'Alex'
    ];
    
    let selectedVoice = null;
    for (const preferredName of preferredVoices) {
        selectedVoice = voices.find(voice => 
            voice.name.includes(preferredName) || 
            voice.name.includes('Female') ||
            (voice.name.includes('Google') && voice.lang.includes('en-US')) ||
            (voice.lang.includes('en-US') && voice.name.includes('English'))
        );
        if (selectedVoice) break;
    }

    // Fallback to any English voice
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.includes('en'));
    }

    if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name);
    } else {
        console.log('Using default voice');
    }

    // Add visual indicators
    utterance.onstart = () => {
        console.log('🔊 Speaking started...');
        addVoiceFeedback('🔊 Speaking...', 'info');
        
        // Add visual indicator to auto-speak toggle
        if (autoSpeakToggle) {
            autoSpeakToggle.parentElement.style.backgroundColor = '#10b981';
            autoSpeakToggle.parentElement.style.transition = 'background-color 0.3s ease';
        }
    };

    utterance.onend = () => {
        console.log('🔊 Speech finished');
        
        // Remove visual indicator
        if (autoSpeakToggle) {
            autoSpeakToggle.parentElement.style.backgroundColor = '';
        }
    };

    utterance.onerror = (event) => {
        console.error('🔊 Speech error:', event);
        addVoiceFeedback('🔊 Speech error occurred', 'error');
        
        // Remove visual indicator
        if (autoSpeakToggle) {
            autoSpeakToggle.parentElement.style.backgroundColor = '';
        }
    };

    // Speak the text
    try {
        speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('🔊 Failed to speak:', error);
        addVoiceFeedback('🔊 Failed to speak', 'error');
    }
}

// Stop speaking immediately
function stopSpeaking() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
}

// Test TTS functionality
function testTTS() {
    const testMessage = "Hello! This is a test of the text-to-speech system.";
    console.log('🔊 Testing TTS...');
    addMessage('bot', '🔊 Testing text-to-speech functionality...');
    speak(testMessage);
}

// Voice Mode Switching
let currentVoiceMode = 'browser'; // 'browser' or 'ragent'

function switchToBrowserVoice() {
    currentVoiceMode = 'browser';
    
    // Update UI
    document.getElementById('browserVoiceBtn').classList.add('active');
    document.getElementById('ragentVoiceBtn').classList.remove('active');
    
    // Update voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.onclick = toggleVoiceRecording;
        voiceBtn.title = 'Browser-based voice input';
        voiceBtn.style.backgroundColor = '';
    }
    
    // Disconnect ragent if connected
    if (window.ragentClient && window.ragentClient.isConnected) {
        window.ragentClient.disconnect();
    }
    
    addMessage('bot', '🎤 Switched to **Browser-based voice** (Web Speech API)');
    console.log('🎤 Switched to browser voice mode');
}

function switchToRagentVoice() {
    currentVoiceMode = 'ragent';
    
    // Update UI
    document.getElementById('ragentVoiceBtn').classList.add('active');
    document.getElementById('browserVoiceBtn').classList.remove('active');
    
    // Update voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.onclick = toggleRagentVoice;
        voiceBtn.title = 'Real-time voice (ragent)';
        voiceBtn.style.backgroundColor = '#8b5cf6';
    }
    
    addMessage('bot', '🚀 Switched to **Real-time voice** (ragent gateway)');
    console.log('🚀 Switched to ragent voice mode');
    
    // Initialize ragent if not already connected
    if (window.ragentClient && !window.ragentClient.isConnected) {
        initRagentVoice();
    }
}

// Enhanced browser support check
function checkBrowserSupport() {
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasWebSocket = 'WebSocket' in window || 'io' in window;

    if (!hasSpeechRecognition) {
        console.warn('Speech recognition not supported');
        if (voiceBtn) {
            voiceBtn.style.opacity = '0.5';
            voiceBtn.title = 'Speech recognition not supported in this browser. Use Chrome, Edge, or Safari.';
        }
        addMessage('bot', '🎤 **Speech recognition is not supported** in your current browser. For the best experience, please use Chrome, Edge, or Safari.');
        
        // Disable browser voice button
        const browserBtn = document.getElementById('browserVoiceBtn');
        if (browserBtn) {
            browserBtn.disabled = true;
            browserBtn.style.opacity = '0.5';
        }
    }

    if (!hasSpeechSynthesis) {
        console.warn('Speech synthesis not supported');
        if (autoSpeakToggle) {
            autoSpeakToggle.disabled = true;
            autoSpeakToggle.parentElement.style.opacity = '0.5';
        }
        addMessage('bot', '🔊 **Text-to-speech is not supported** in your current browser.');
    } else {
        // Initialize TTS voices
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => {
            const voices = speechSynthesis.getVoices();
            console.log(`🔊 TTS loaded with ${voices.length} voices available`);
            
            if (voices.length > 0) {
                addMessage('bot', `🔊 **Text-to-speech enabled** with ${voices.length} voices available. Click the Auto-speak toggle to enable/disable.`);
                
                // Add a test button for TTS
                setTimeout(() => {
                    addMessage('bot', '💡 **Tip:** You can test TTS by typing "test voice" in the chat.');
                }, 2000);
            }
        };
        
        // Force voice loading
        setTimeout(() => {
            const voices = speechSynthesis.getVoices();
            if (voices.length === 0) {
                console.log('🔊 No voices loaded, trying to reload...');
                speechSynthesis.getVoices();
            }
        }, 1000);
    }

    if (!hasGetUserMedia) {
        console.warn('Microphone access not supported');
        addMessage('bot', '🎤 **Microphone access is not supported** in your current browser.');
    }

    if (!hasWebSocket) {
        console.warn('WebSocket not supported');
        addMessage('bot', '🔗 **WebSocket not supported** - Real-time voice (ragent) may not work properly.');
        
        // Disable ragent button
        const ragentBtn = document.getElementById('ragentVoiceBtn');
        if (ragentBtn) {
            ragentBtn.disabled = true;
            ragentBtn.style.opacity = '0.5';
        }
    }

    // Check microphone permissions on load
    if (hasGetUserMedia) {
        navigator.permissions.query({ name: 'microphone' }).then(result => {
            if (result.state === 'denied') {
                addMessage('bot', '🎤 **Microphone access is blocked.** Click the microphone button to see instructions on how to enable it.');
            }
        }).catch(() => {
            // Permission API not supported, will check on first click
        });
    }
}

// Enhanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + Space for voice
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        toggleVoiceRecording();
    }
    
    // Escape to stop recording/speaking
    if (e.key === 'Escape') {
        if (isRecording) {
            recognition.stop();
        }
        stopSpeaking();
    }
});

// Add voice feedback for better UX
function addVoiceFeedback(message, type = 'info') {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `voice-feedback ${type}`;
    feedbackDiv.textContent = message;
    
    // Position near the voice button
    const voiceBtnRect = voiceBtn.getBoundingClientRect();
    feedbackDiv.style.position = 'fixed';
    feedbackDiv.style.top = `${voiceBtnRect.bottom + 10}px`;
    feedbackDiv.style.left = `${voiceBtnRect.left}px`;
    feedbackDiv.style.zIndex = '1000';
    feedbackDiv.style.padding = '8px 12px';
    feedbackDiv.style.borderRadius = '6px';
    feedbackDiv.style.fontSize = '14px';
    feedbackDiv.style.backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
    feedbackDiv.style.color = 'white';
    feedbackDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    document.body.appendChild(feedbackDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (feedbackDiv.parentNode) {
            feedbackDiv.parentNode.removeChild(feedbackDiv);
        }
    }, 3000);
}
