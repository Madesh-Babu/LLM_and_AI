// Ragent Voice Gateway Client
class RagentVoiceClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.sessionId = null;
        this.onTranscript = null;
        this.onAIResponse = null;
        this.onStatusChange = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
    }

    async connect() {
        try {
            // Connect to WebSocket
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔗 Connected to ragent voice gateway');
                this.isConnected = true;
                this.onStatusChange?.('connected');
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from ragent');
                this.isConnected = false;
                this.onStatusChange?.('disconnected');
            });

            this.socket.on('ai_response', (data) => {
                console.log('🤖 AI Response:', data);
                this.onAIResponse?.(data.response, data.session_id);
            });

            this.socket.on('voice_session_start', (data) => {
                console.log('🎤 Voice session started:', data);
                this.sessionId = data.session_id;
                this.onStatusChange?.('recording');
            });

            this.socket.on('voice_session_end', (data) => {
                console.log('🔇 Voice session ended:', data);
                this.sessionId = null;
                this.onStatusChange?.('stopped');
            });

            this.socket.on('error', (error) => {
                console.error('❌ Ragent error:', error);
                this.onStatusChange?.('error');
            });

        } catch (error) {
            console.error('❌ Failed to connect to ragent:', error);
            this.onStatusChange?.('error');
        }
    }

    async startVoiceSession() {
        if (!this.isConnected) {
            throw new Error('Not connected to ragent');
        }

        try {
            // Get microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Setup media recorder
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.sendAudioToRagent(audioBlob);
                this.audioChunks = [];
            };

            // Start recording
            this.mediaRecorder.start(100); // Send chunks every 100ms
            
            // Notify ragent to start session
            this.socket.emit('start_voice_session');
            
            console.log('🎤 Voice session started');
            
        } catch (error) {
            console.error('❌ Failed to start voice session:', error);
            this.stopVoiceSession();
            throw error;
        }
    }

    stopVoiceSession() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Notify ragent to end session
        if (this.socket && this.isConnected) {
            this.socket.emit('end_voice_session', { session_id: this.sessionId });
        }

        console.log('🔇 Voice session stopped');
    }

    sendAudioToRagent(audioBlob) {
        if (!this.isConnected || !this.socket) {
            console.error('❌ Not connected to ragent');
            return;
        }

        // Convert blob to base64 and send
        const reader = new FileReader();
        reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            this.socket.emit('voice_audio', {
                audio: base64Audio,
                session_id: this.sessionId
            });
        };
        reader.readAsDataURL(audioBlob);
    }

    disconnect() {
        this.stopVoiceSession();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        console.log('🔌 Disconnected from ragent');
    }
}

// Initialize ragent client
const ragentClient = new RagentVoiceClient();

// Ragent Voice Controls
let isRagentRecording = false;

// Initialize ragent voice system
async function initRagentVoice() {
    try {
        await ragentClient.connect();
        
        // Set up callbacks
        ragentClient.onStatusChange = (status) => {
            console.log('🎤 Ragent status:', status);
            updateRagentUI(status);
        };

        ragentClient.onAIResponse = (response, sessionId) => {
            console.log('🤖 Ragent AI Response:', response);
            addMessage('bot', response);
            speak(response); // Use existing TTS for now
        };

        console.log('🔗 Ragent voice client initialized');
        addMessage('bot', '🚀 **Real-time voice system** connected and ready!');
        
    } catch (error) {
        console.error('❌ Failed to initialize ragent:', error);
        addMessage('bot', '❌ Failed to initialize real-time voice system. Falling back to browser-based voice.');
    }
}

// Update UI based on ragent status
function updateRagentUI(status) {
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceStatusText = document.getElementById('voiceStatusText');

    switch (status) {
        case 'connected':
            if (voiceBtn) voiceBtn.style.backgroundColor = '#8b5cf6';
            if (voiceStatusText) voiceStatusText.textContent = 'Real-time ready';
            break;
            
        case 'recording':
            if (voiceBtn) voiceBtn.classList.add('recording');
            if (voiceStatus) voiceStatus.classList.add('active');
            if (voiceStatusText) voiceStatusText.textContent = 'Real-time listening...';
            isRagentRecording = true;
            break;
            
        case 'stopped':
            if (voiceBtn) voiceBtn.classList.remove('recording');
            if (voiceStatus) voiceStatus.classList.remove('active');
            if (voiceStatusText) voiceStatusText.textContent = 'Real-time ready';
            isRagentRecording = false;
            break;
            
        case 'disconnected':
            if (voiceBtn) voiceBtn.style.backgroundColor = '#ef4444';
            if (voiceStatusText) voiceStatusText.textContent = 'Real-time disconnected';
            break;
            
        case 'error':
            if (voiceBtn) voiceBtn.style.backgroundColor = '#ef4444';
            if (voiceStatusText) voiceStatusText.textContent = 'Real-time error';
            break;
    }
}

// Toggle ragent voice recording
async function toggleRagentVoice() {
    if (!ragentClient.isConnected) {
        addMessage('bot', '🔗 Connecting to real-time voice system...');
        await initRagentVoice();
        return;
    }

    if (isRagentRecording) {
        ragentClient.stopVoiceSession();
    } else {
        try {
            await ragentClient.startVoiceSession();
        } catch (error) {
            console.error('❌ Failed to start ragent voice:', error);
            addMessage('bot', '❌ Failed to start real-time voice. Please check microphone permissions.');
        }
    }
}

// Override existing voice button to use ragent
function setupRagentVoiceButton() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.onclick = toggleRagentVoice;
        voiceBtn.title = 'Real-time voice (ragent)';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ragent after a short delay
    setTimeout(initRagentVoice, 1000);
    setupRagentVoiceButton();
});

// Export for global access
window.ragentClient = ragentClient;
window.toggleRagentVoice = toggleRagentVoice;
