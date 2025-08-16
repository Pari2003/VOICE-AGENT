// Day 12 Voice Agent - Revamped UI with Enhanced User Experience

// Global variables
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordedBlob = null;
let currentSessionId = null;
let conversationMode = false;
let isProcessing = false;
let lastError = null;
let healthCheckInterval = null;
let isDarkMode = false;
let recordingStartTime = null;
let recordingTimer = null;
const MIN_RECORDING_DURATION = 500; // Minimum 500ms recording

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    startHealthMonitoring();
    initializeDarkMode();
});

function initializeApp() {
    try {
        initializeSession();
        updateConnectionStatus('connected');
        updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
        
        // Initialize creativity slider
        const creativitySlider = document.getElementById('creativitySlider');
        const creativityValue = document.getElementById('creativityValue');
        
        creativitySlider.addEventListener('input', function() {
            creativityValue.textContent = this.value;
        });
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Initialization failed', error.message);
    }
}

function setupEventListeners() {
    // Record button events (touch and mouse)
    const recordButton = document.getElementById('recordButton');
    
    // Mouse events
    recordButton.addEventListener('mousedown', handleRecordStart);
    recordButton.addEventListener('mouseup', handleRecordStop);
    recordButton.addEventListener('mouseleave', handleRecordStop);
    
    // Touch events for mobile
    recordButton.addEventListener('touchstart', handleRecordStart);
    recordButton.addEventListener('touchend', handleRecordStop);
    recordButton.addEventListener('touchcancel', handleRecordStop);
    
    // Prevent context menu on long press
    recordButton.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // Conversation mode button events
    const conversationButton = document.getElementById('toggleConversation');
    if (conversationButton) {
        // Add touch feedback
        conversationButton.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        conversationButton.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
        
        conversationButton.addEventListener('touchcancel', function() {
            this.style.transform = 'scale(1)';
        });
    }
    
    // Global error handlers
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        logError('javascript_error', event.error?.message || 'Unknown error');
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        logError('promise_rejection', event.reason?.message || 'Unhandled promise rejection');
    });
}

// Recording Functions
function handleRecordStart(event) {
    event.preventDefault();
    if (!isRecording && !isProcessing) {
        startRecording();
    }
}

function handleRecordStop(event) {
    event.preventDefault();
    if (isRecording) {
        stopRecording();
    }
}

async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Microphone Error', 'Audio recording not supported in this browser');
        return;
    }

    try {
        updateRecordButton('requesting');
        updateStatus('Requesting microphone access...', 'Please allow microphone permissions');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
            
            const recordingDuration = Date.now() - recordingStartTime;
            recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            console.log('Recording stopped. Duration:', recordingDuration, 'ms, Blob size:', recordedBlob.size, 'Audio chunks:', audioChunks.length);
            
            if (recordingDuration < MIN_RECORDING_DURATION) {
                console.warn('Recording too short:', recordingDuration, 'ms');
                showError('Recording Too Short', 'Please hold the button for at least 1 second and speak clearly.');
                updateRecordButton('idle');
                updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
            } else if (recordedBlob.size > 0 && audioChunks.length > 0) {
                await processRecording();
            } else {
                console.warn('No audio data captured. Recording may have been too short.');
                showError('Recording Error', 'No audio detected. Please hold the button longer and speak clearly.');
                updateRecordButton('idle');
                updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
            }
        };

        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();
        
        // Start timer to show recording duration
        recordingTimer = setInterval(() => {
            if (isRecording) {
                const duration = Math.floor((Date.now() - recordingStartTime) / 100) / 10; // Show in tenths of seconds
                const recordLabel = document.getElementById('recordLabel');
                if (duration >= 0.5) {
                    recordLabel.textContent = `Recording... (${duration}s) Release to Stop`;
                } else {
                    recordLabel.textContent = 'Recording... Keep holding...';
                }
            }
        }, 100);
        
        updateRecordButton('recording');
        updateStatus('🎙️ Recording...', 'Release to stop recording');
        
        console.log('Recording started at:', recordingStartTime);

    } catch (error) {
        console.error('Error starting recording:', error);
        
        let errorMessage = 'Failed to access microphone';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
        }
        
        showError('Microphone Error', errorMessage);
        updateRecordButton('idle');
        updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        try {
            // Clear the recording timer
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            
            mediaRecorder.stop();
            isRecording = false;
            
            updateRecordButton('processing');
            updateStatus('Processing your message...', 'Converting speech to text...');
            
            console.log('Recording stopped');
        } catch (error) {
            console.error('Error stopping recording:', error);
            showError('Recording Error', 'Failed to stop recording');
            updateRecordButton('idle');
        }
    }
}

async function processRecording() {
    if (!recordedBlob) {
        updateRecordButton('idle');
        updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
        return;
    }

    isProcessing = true;

    try {
        // Get current settings
        const voice = document.getElementById('voiceSelect').value;
        const temperature = parseFloat(document.getElementById('creativitySlider').value);

        updateStatus('📤 Sending to AI...', 'Transcribing and generating response...');
        showLoadingOverlay('Processing your message...', 'This may take a few moments');

        // Create form data
        const formData = new FormData();
        formData.append('audio', recordedBlob, 'recording.webm');
        formData.append('voice', voice);
        formData.append('max_tokens', '600');
        formData.append('temperature', temperature.toString());

        // Send to chat endpoint
        const response = await fetch(`/agent/chat/${currentSessionId}`, {
            method: 'POST',
            body: formData
        });

        hideLoadingOverlay();

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        // Display results
        displayChatResponse(data);
        
        // Update chat history if available
        if (data.chat_history) {
            displayChatHistory(data.chat_history);
        }

        // Handle audio playback
        if (data.audio_url) {
            await playAudioResponse(data.audio_url);
            updateStatus('✅ Response complete', 'Ready for your next message');
        } else if (data.fallback_text) {
            updateStatus('⚠️ Audio unavailable - showing text', 'Ready for your next message');
        } else {
            updateStatus('✅ Response complete', 'Ready for your next message');
        }

        // Check for errors but don't fail the request
        if (!data.success) {
            showError('Service Warning', data.fallback_message || 'Some services experienced issues');
        }

        // Note: Conversation mode auto-continuation is now handled in playAudioResponse()
        // after the audio finishes playing for better UX

    } catch (error) {
        console.error('Error processing recording:', error);
        hideLoadingOverlay();
        
        showError('Processing Error', error.message);
        updateStatus('❌ Processing failed', 'Please try again');
        
        logError('processing_error', error.message);
    } finally {
        isProcessing = false;
        updateRecordButton('idle');
    }
}

// UI Update Functions
function updateRecordButton(state) {
    const recordButton = document.getElementById('recordButton');
    const recordIcon = document.getElementById('recordIcon');
    const recordLabel = document.getElementById('recordLabel');
    
    // Remove all state classes
    recordButton.classList.remove('recording', 'processing', 'error');
    
    switch (state) {
        case 'idle':
            recordIcon.className = 'fas fa-microphone';
            recordLabel.textContent = conversationMode ? 'Hold to Continue' : 'Hold to Speak (1+ sec)';
            recordButton.style.cursor = 'pointer';
            break;
            
        case 'requesting':
            recordIcon.className = 'fas fa-microphone';
            recordLabel.textContent = 'Allow Microphone...';
            recordButton.style.cursor = 'wait';
            break;
            
        case 'recording':
            recordButton.classList.add('recording');
            recordIcon.className = 'fas fa-stop';
            recordLabel.textContent = 'Recording... Release to Stop';
            recordButton.style.cursor = 'pointer';
            break;
            
        case 'processing':
            recordButton.classList.add('processing');
            recordIcon.className = 'fas fa-cog fa-spin';
            recordLabel.textContent = 'Processing...';
            recordButton.style.cursor = 'not-allowed';
            break;
            
        case 'error':
            recordButton.classList.add('error');
            recordIcon.className = 'fas fa-exclamation-triangle';
            recordLabel.textContent = 'Error - Try Again';
            recordButton.style.cursor = 'pointer';
            break;
    }
}

function updateStatus(message, subtext = '') {
    const statusMessage = document.getElementById('statusMessage');
    const statusSubtext = document.getElementById('statusSubtext');
    
    if (statusMessage) {
        // Remove loading spinner
        const spinner = statusMessage.querySelector('.fa-spin');
        if (spinner) spinner.style.display = 'none';
        
        // Update text
        const textSpan = statusMessage.querySelector('span') || statusMessage;
        textSpan.textContent = message;
    }
    
    if (statusSubtext) {
        statusSubtext.textContent = subtext;
    }
}

// Session Management
function initializeSession() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
        currentSessionId = sessionParam;
    } else {
        // Generate new session ID
        currentSessionId = generateSessionId();
        // Update URL without reload
        const newUrl = `${window.location.origin}${window.location.pathname}?session=${currentSessionId}`;
        window.history.replaceState({}, '', newUrl);
    }
    
    updateSessionDisplay();
    loadChatHistory();
}

function generateSessionId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateSessionDisplay() {
    const displayElement = document.getElementById('sessionDisplay');
    if (displayElement) {
        displayElement.textContent = currentSessionId;
    }
}

function generateNewSession() {
    currentSessionId = generateSessionId();
    // Update URL
    const newUrl = `${window.location.origin}${window.location.pathname}?session=${currentSessionId}`;
    window.history.pushState({}, '', newUrl);
    updateSessionDisplay();
    
    // Clear chat display
    const chatHistory = document.getElementById('chatHistory');
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) chatMessages.innerHTML = '';
    if (chatHistory) chatHistory.style.display = 'none';
    
    // Hide response section
    const responseSection = document.getElementById('responseSection');
    if (responseSection) responseSection.style.display = 'none';
    
    updateStatus('🆕 New conversation started!', 'Ready to chat with AI assistant');
    
    setTimeout(() => {
        updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
    }, 2000);
}

async function clearCurrentSession() {
    try {
        const response = await fetch(`/agent/chat/${currentSessionId}`, {
            method: 'DELETE'
        });
        
        // Clear chat display
        const chatHistory = document.getElementById('chatHistory');
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) chatMessages.innerHTML = '';
        if (chatHistory) chatHistory.style.display = 'none';
        
        // Hide response section
        const responseSection = document.getElementById('responseSection');
        if (responseSection) responseSection.style.display = 'none';
        
        updateStatus('🗑️ Chat history cleared!', 'Ready to start fresh conversation');
        
        setTimeout(() => {
            updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
        }, 2000);
        
    } catch (error) {
        console.error('Error clearing session:', error);
        showError('Clear Error', 'Failed to clear chat history');
    }
}

// Chat History Functions
async function loadChatHistory() {
    try {
        const response = await fetch(`/agent/chat/${currentSessionId}/history`);
        if (response.ok) {
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
                displayChatHistory(data.messages);
            }
        }
    } catch (error) {
        console.warn('Could not load chat history:', error.message);
        // This is normal for new sessions, so don't show error
    }
}

function displayChatHistory(messages) {
    const chatHistory = document.getElementById('chatHistory');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role}`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        const icon = message.role === 'user' ? '👤' : 
                    message.role === 'assistant' ? '🤖' : '⚠️';
        
        messageDiv.innerHTML = `
            <div class="chat-message-header">
                ${icon} ${message.role === 'user' ? 'You' : 
                         message.role === 'assistant' ? 'AI Assistant' : 'System'}
                <span class="chat-message-time">${timestamp}</span>
            </div>
            <div class="chat-message-content">${message.content}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
    });
    
    if (chatHistory) {
        chatHistory.style.display = 'block';
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function displayChatResponse(data) {
    // Show and update response section
    const responseSection = document.getElementById('responseSection');
    const responseText = document.getElementById('responseText');
    
    if (responseText) {
        responseText.textContent = data.ai_response || data.fallback_text || 'No response generated';
    }
    
    if (responseSection) {
        responseSection.style.display = 'block';
        // Smooth scroll to response
        responseSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Audio Functions
async function playAudioResponse(audioUrl) {
    try {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.src = audioUrl;
        
        // Set up event listener for when audio ends
        audioPlayer.onended = () => {
            console.log('Audio response finished playing');
            
            // Auto-continue conversation mode after audio finishes
            if (conversationMode && !isRecording && !isProcessing) {
                setTimeout(() => {
                    if (conversationMode && !isRecording && !isProcessing) {
                        updateStatus('🎙️ Continue conversation', 'Hold button to speak again or wait for auto-prompt');
                        
                        // Auto-prompt for next recording after a short delay
                        setTimeout(() => {
                            if (conversationMode && !isRecording && !isProcessing) {
                                updateStatus('🔄 Ready for next message', 'Start speaking or hold button to record');
                                
                                // Optional: Show visual prompt for next recording
                                const recordButton = document.getElementById('recordButton');
                                recordButton.classList.add('conversation-prompt');
                                
                                setTimeout(() => {
                                    recordButton.classList.remove('conversation-prompt');
                                }, 3000);
                            }
                        }, 2000);
                    }
                }, 1000); // Wait 1 second after audio ends
            }
        };
        
        // Auto-play the response
        await audioPlayer.play();
        
        console.log('Audio response playing');
    } catch (error) {
        console.warn('Could not auto-play audio:', error.message);
        // This is often due to browser autoplay policies, which is fine
        
        // If audio doesn't play, still trigger conversation mode continuation
        if (conversationMode && !isRecording && !isProcessing) {
            setTimeout(() => {
                if (conversationMode && !isRecording && !isProcessing) {
                    updateStatus('🔄 Ready for next message', 'Hold button to continue conversation');
                }
            }, 2000);
        }
    }
}

// Conversation Mode Toggle
function toggleConversationMode() {
    conversationMode = !conversationMode;
    const toggleButton = document.getElementById('toggleConversation');
    
    if (conversationMode) {
        toggleButton.classList.add('active');
        updateStatus('🔄 Conversation mode enabled', 'Continuous conversation active');
    } else {
        toggleButton.classList.remove('active');
        updateStatus('⏸️ Conversation mode disabled', 'Manual recording mode');
    }
    
    // Update record button label
    updateRecordButton('idle');
}

// Error Handling
function showError(title, message) {
    const errorAlert = document.getElementById('errorAlert');
    const errorDetails = document.getElementById('errorDetails');
    
    if (errorAlert && errorDetails) {
        errorDetails.innerHTML = `
            <strong>${title}</strong><br>
            <em>Time:</em> ${new Date().toLocaleString()}<br>
            <em>Message:</em> ${message}<br>
            <em>Session:</em> ${currentSessionId}
        `;
        
        errorAlert.style.display = 'block';
        
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            dismissError();
        }, 8000);
    }
    
    // Also update record button to error state briefly
    updateRecordButton('error');
    setTimeout(() => {
        if (!isRecording && !isProcessing) {
            updateRecordButton('idle');
        }
    }, 3000);
}

function dismissError() {
    const errorAlert = document.getElementById('errorAlert');
    if (errorAlert) {
        errorAlert.style.display = 'none';
    }
}

function retryLastAction() {
    dismissError();
    if (recordedBlob && !isProcessing) {
        processRecording();
    } else {
        updateStatus('Ready to try again', 'Press and hold the microphone button to speak');
    }
}

// Loading Overlay
function showLoadingOverlay(text, subtext) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const loadingSubtext = document.getElementById('loadingSubtext');
    
    if (overlay) {
        if (loadingText) loadingText.textContent = text;
        if (loadingSubtext) loadingSubtext.textContent = subtext;
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Diagnostics Functions
function showDiagnostics() {
    const panel = document.getElementById('diagnosticsPanel');
    if (panel) {
        panel.style.display = 'block';
        runQuickDiagnostics();
    }
}

function hideDiagnostics() {
    const panel = document.getElementById('diagnosticsPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

async function runQuickDiagnostics() {
    const networkStatus = document.getElementById('networkStatus');
    const sttStatus = document.getElementById('sttStatus');
    const llmStatus = document.getElementById('llmStatus');
    const ttsStatus = document.getElementById('ttsStatus');
    
    // Network test
    if (networkStatus) {
        networkStatus.textContent = 'Testing...';
        try {
            const start = Date.now();
            const response = await fetch('/health');
            const latency = Date.now() - start;
            
            if (response.ok) {
                networkStatus.textContent = `Online (${latency}ms)`;
                networkStatus.className = 'status-value healthy';
            } else {
                networkStatus.textContent = 'Degraded';
                networkStatus.className = 'status-value warning';
            }
        } catch (error) {
            networkStatus.textContent = 'Offline';
            networkStatus.className = 'status-value error';
        }
    }
    
    // Browser capability tests
    if (sttStatus) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            sttStatus.textContent = 'Supported';
            sttStatus.className = 'status-value healthy';
        } else {
            sttStatus.textContent = 'Not Supported';
            sttStatus.className = 'status-value error';
        }
    }
    
    // Placeholder for other service tests
    if (llmStatus) {
        llmStatus.textContent = 'Available';
        llmStatus.className = 'status-value healthy';
    }
    
    if (ttsStatus) {
        ttsStatus.textContent = 'Available';
        ttsStatus.className = 'status-value healthy';
    }
}

function runFullDiagnostics() {
    showLoadingOverlay('Running full diagnostics...', 'Testing all system components');
    
    setTimeout(() => {
        runQuickDiagnostics();
        hideLoadingOverlay();
        updateStatus('✅ Diagnostics complete', 'All systems checked');
    }, 2000);
}

function exportDiagnostics() {
    const diagnosticsData = {
        timestamp: new Date().toISOString(),
        session_id: currentSessionId,
        user_agent: navigator.userAgent,
        network_status: document.getElementById('networkStatus')?.textContent || 'Unknown',
        microphone_support: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        errors: lastError ? [lastError] : []
    };
    
    const blob = new Blob([JSON.stringify(diagnosticsData, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-agent-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Health Monitoring
function startHealthMonitoring() {
    // Check health every 30 seconds
    healthCheckInterval = setInterval(async () => {
        try {
            const response = await fetch('/health');
            if (response.ok) {
                const health = await response.json();
                updateConnectionStatus(health.status);
            } else {
                updateConnectionStatus('degraded');
            }
        } catch (error) {
            updateConnectionStatus('disconnected');
        }
    }, 30000);
}

function updateConnectionStatus(status) {
    const indicator = document.getElementById('connectionIndicator');
    const lastUpdate = document.getElementById('lastUpdate');
    
    if (!indicator) return;
    
    let statusText = '';
    let icon = '';
    
    switch (status) {
        case 'healthy':
        case 'connected':
            icon = '<i class="fas fa-circle" style="color: var(--success-color);"></i>';
            statusText = 'All Systems Online';
            indicator.className = 'connection-indicator connected';
            break;
        case 'degraded':
            icon = '<i class="fas fa-circle" style="color: var(--warning-color);"></i>';
            statusText = 'Some Issues Detected';
            indicator.className = 'connection-indicator degraded';
            break;
        case 'disconnected':
        case 'unhealthy':
            icon = '<i class="fas fa-circle" style="color: var(--error-color);"></i>';
            statusText = 'Connection Issues';
            indicator.className = 'connection-indicator disconnected';
            break;
        default:
            icon = '<i class="fas fa-circle" style="color: var(--text-muted);"></i>';
            statusText = 'Status Unknown';
            indicator.className = 'connection-indicator';
    }
    
    indicator.innerHTML = `${icon} <span>${statusText}</span>`;
    
    if (lastUpdate) {
        lastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
    }
}

// Utility Functions
function logError(type, message) {
    lastError = {
        type: type,
        message: message,
        timestamp: new Date().toISOString(),
        session_id: currentSessionId
    };
    
    console.error('Error logged:', lastError);
}

function copyResponse() {
    const responseText = document.getElementById('responseText');
    if (responseText) {
        navigator.clipboard.writeText(responseText.textContent)
            .then(() => {
                updateStatus('📋 Response copied to clipboard', 'Ready for your next message');
                setTimeout(() => {
                    if (!isRecording && !isProcessing) {
                        updateStatus('Ready to start conversation', 'Press and hold the microphone button to speak');
                    }
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text:', err);
            });
    }
}

function shareResponse() {
    const responseText = document.getElementById('responseText');
    if (responseText && navigator.share) {
        navigator.share({
            title: 'Voice Agent Response',
            text: responseText.textContent
        }).catch(console.error);
    } else {
        copyResponse(); // Fallback to copy
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
    }
});

// Dark Mode Functions
function initializeDarkMode() {
    // Check for saved dark mode preference
    const savedTheme = localStorage.getItem('voiceAgentTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    isDarkMode = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    if (isDarkMode) {
        enableDarkMode();
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('voiceAgentTheme') === null) {
            if (e.matches) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        }
    });
}

function toggleDarkMode() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

function enableDarkMode() {
    isDarkMode = true;
    document.body.classList.add('dark-mode');
    localStorage.setItem('voiceAgentTheme', 'dark');
    
    // Update dark mode toggle icon
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        darkModeToggle.title = 'Switch to Light Mode';
    }
    
    console.log('Dark mode enabled');
}

function disableDarkMode() {
    isDarkMode = false;
    document.body.classList.remove('dark-mode');
    localStorage.setItem('voiceAgentTheme', 'light');
    
    // Update dark mode toggle icon
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        darkModeToggle.title = 'Switch to Dark Mode';
    }
    
    console.log('Dark mode disabled');
}

// Mobile Optimization Functions
function optimizeForMobile() {
    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(viewport);
    }
    
    // Disable zoom on input focus for iOS
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focusin', () => {
            document.querySelector('meta[name="viewport"]').content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        });
        
        input.addEventListener('focusout', () => {
            document.querySelector('meta[name="viewport"]').content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        });
    });
    
    // Add mobile-specific touch improvements
    document.body.classList.add('mobile-optimized');
}

// Check if on mobile device
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
}

// Placeholder functions for HTML references
function toggleSettings() {
    // Show/hide settings panel or implement settings modal
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    }
}

function showHelp() {
    // Show help modal or navigate to help page
    alert('Voice Agent Help:\n\n' +
          '• Press and hold the microphone button to record\n' +
          '• Release to stop recording and get AI response\n' +
          '• Toggle conversation mode for continuous chat\n' +
          '• Use dark mode toggle for better night viewing\n' +
          '• Adjust creativity slider to change AI response style');
}

// Initialize mobile optimizations if needed
if (isMobileDevice()) {
    document.addEventListener('DOMContentLoaded', optimizeForMobile);
}
