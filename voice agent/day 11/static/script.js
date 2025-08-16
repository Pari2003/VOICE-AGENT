// Day 11 Enhanced Voice Agent with Comprehensive Error Handling

// Global variables
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordedBlob = null;
let currentSessionId = null;
let conversationMode = false;
let autoPause = false;
let lastFailedRequest = null;
let errorLog = [];
let retryCount = 0;
let maxRetries = 3;

// Error tracking and health monitoring
let serviceHealth = {
    stt: { status: 'unknown', lastError: null, errorCount: 0 },
    llm: { status: 'unknown', lastError: null, errorCount: 0 },
    tts: { status: 'unknown', lastError: null, errorCount: 0 },
    network: { status: 'unknown', lastError: null, errorCount: 0 }
};

// Initialize on page load with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeSession();
        setupErrorHandlers();
        startHealthMonitoring();
        updateConnectionStatus('connected');
    } catch (error) {
        logError('initialization_error', error.message);
        showErrorAlert('Failed to initialize application', error.message);
    }
});

// Enhanced error logging
function logError(type, message, details = null) {
    const errorEntry = {
        timestamp: new Date().toISOString(),
        type: type,
        message: message,
        details: details,
        sessionId: currentSessionId
    };
    
    errorLog.push(errorEntry);
    console.error('Error logged:', errorEntry);
    
    // Update service health
    updateServiceHealth(type, false, message);
    
    // Show in UI if error log is visible
    updateErrorLogDisplay();
    
    // Send to server for logging (best effort)
    try {
        // Could implement server-side error logging here
    } catch (e) {
        console.warn('Failed to send error to server:', e);
    }
}

function updateServiceHealth(service, isHealthy, errorMessage = null) {
    const serviceKey = service.includes('transcription') || service.includes('stt') ? 'stt' :
                      service.includes('llm') || service.includes('ai') ? 'llm' :
                      service.includes('tts') || service.includes('audio') ? 'tts' : 'network';
    
    if (serviceHealth[serviceKey]) {
        serviceHealth[serviceKey].status = isHealthy ? 'healthy' : 'error';
        serviceHealth[serviceKey].lastCheck = new Date().toISOString();
        
        if (!isHealthy) {
            serviceHealth[serviceKey].errorCount++;
            serviceHealth[serviceKey].lastError = errorMessage;
        } else {
            serviceHealth[serviceKey].errorCount = 0;
            serviceHealth[serviceKey].lastError = null;
        }
    }
    
    updateConnectionStatus();
}

function updateConnectionStatus(forceStatus = null) {
    const indicator = document.getElementById('connectionIndicator');
    const lastUpdate = document.getElementById('lastUpdate');
    
    let status = forceStatus;
    let statusText = '';
    let emoji = '';
    
    if (!status) {
        const healthyServices = Object.values(serviceHealth).filter(s => s.status === 'healthy').length;
        const totalServices = Object.keys(serviceHealth).length;
        
        if (healthyServices === totalServices) {
            status = 'connected';
        } else if (healthyServices > totalServices / 2) {
            status = 'degraded';
        } else {
            status = 'disconnected';
        }
    }
    
    switch (status) {
        case 'connected':
            emoji = '🟢';
            statusText = 'All Services Online';
            break;
        case 'degraded':
            emoji = '🟡';
            statusText = 'Some Services Degraded';
            break;
        case 'disconnected':
            emoji = '🔴';
            statusText = 'Services Offline';
            break;
    }
    
    indicator.textContent = `${emoji} ${statusText}`;
    indicator.className = `connection-indicator ${status}`;
    lastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
}

function startHealthMonitoring() {
    // Check health every 30 seconds
    setInterval(async () => {
        try {
            await checkSystemHealth();
        } catch (error) {
            logError('health_check_error', error.message);
        }
    }, 30000);
}

async function checkSystemHealth() {
    try {
        const response = await fetch('/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const health = await response.json();
            updateHealthDisplay(health);
            
            // Update individual service health
            if (health.services) {
                Object.keys(health.services).forEach(service => {
                    const serviceData = health.services[service];
                    updateServiceHealth(service, serviceData.status === 'healthy');
                });
            }
        } else {
            throw new Error(`Health check failed: ${response.status}`);
        }
    } catch (error) {
        logError('health_check_error', error.message);
        updateConnectionStatus('disconnected');
    }
}

function updateHealthDisplay(health) {
    const healthStatus = document.getElementById('healthStatus');
    const healthDetails = document.getElementById('healthDetails');
    
    if (!healthStatus || !healthDetails) return;
    
    healthStatus.style.display = 'block';
    healthStatus.className = `health-status ${health.status}`;
    
    healthDetails.innerHTML = `
        <strong>Overall Status:</strong> ${health.status.toUpperCase()}<br>
        <strong>Timestamp:</strong> ${new Date(health.timestamp).toLocaleString()}<br>
        <strong>Active Sessions:</strong> ${health.active_sessions || 0}<br>
        <strong>Issues:</strong> ${health.issues.length > 0 ? health.issues.join(', ') : 'None'}<br>
        <br><strong>Service Details:</strong><br>
        ${Object.entries(health.services || {}).map(([name, service]) => 
            `• ${name}: ${service.status} (errors: ${service.error_count || 0})`
        ).join('<br>')}
    `;
}

function showErrorAlert(title, message, errorType = 'general') {
    const errorAlert = document.getElementById('errorAlert');
    const errorDetails = document.getElementById('errorDetails');
    
    if (!errorAlert || !errorDetails) return;
    
    errorDetails.innerHTML = `
        <strong>${title}</strong><br>
        <em>Error Type:</em> ${errorType}<br>
        <em>Message:</em> ${message}<br>
        <em>Time:</em> ${new Date().toLocaleString()}<br>
        <em>Session:</em> ${currentSessionId || 'None'}
    `;
    
    errorAlert.style.display = 'block';
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        dismissError();
    }, 10000);
}

function dismissError() {
    const errorAlert = document.getElementById('errorAlert');
    if (errorAlert) {
        errorAlert.style.display = 'none';
    }
}

function showErrorRecovery(errorType, originalRequest = null) {
    const errorRecovery = document.getElementById('errorRecovery');
    const recoveryOptions = document.getElementById('recoveryOptions');
    
    if (!errorRecovery || !recoveryOptions) return;
    
    lastFailedRequest = originalRequest;
    
    let options = '';
    
    switch (errorType) {
        case 'transcription_error':
            options = `
                <button onclick="retryWithDifferentMic()">🎤 Try Different Microphone</button>
                <button onclick="retryCurrentRequest()">🔄 Retry Transcription</button>
                <button onclick="switchToTextInput()">⌨️ Switch to Text Input</button>
            `;
            break;
        case 'llm_error':
            options = `
                <button onclick="retryCurrentRequest()">🔄 Retry AI Request</button>
                <button onclick="simplifyRequest()">📝 Simplify Request</button>
                <button onclick="checkSystemHealth()">🏥 Check System Health</button>
            `;
            break;
        case 'tts_error':
            options = `
                <button onclick="retryCurrentRequest()">🔄 Retry Audio Generation</button>
                <button onclick="useTextFallback()">📝 Use Text Response</button>
                <button onclick="changeTTSVoice()">🎭 Try Different Voice</button>
            `;
            break;
        case 'network_error':
            options = `
                <button onclick="retryCurrentRequest()">🔄 Retry Request</button>
                <button onclick="checkNetworkConnection()">🌐 Check Network</button>
                <button onclick="workOffline()">📱 Work Offline</button>
            `;
            break;
        default:
            options = `
                <button onclick="retryCurrentRequest()">🔄 Retry</button>
                <button onclick="refreshPage()">🔄 Refresh Page</button>
                <button onclick="runDiagnostics()">🔧 Run Diagnostics</button>
            `;
    }
    
    recoveryOptions.innerHTML = options;
    errorRecovery.style.display = 'block';
}

function hideErrorRecovery() {
    const errorRecovery = document.getElementById('errorRecovery');
    if (errorRecovery) {
        errorRecovery.style.display = 'none';
    }
}

// Enhanced request wrapper with retries and error handling
async function makeRobustRequest(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            updateChatStatus(`🔄 Attempt ${attempt}/${maxRetries}...`, 'processing');
            
            const timeoutId = setTimeout(() => {
                throw new Error('Request timeout');
            }, 60000); // 60 second timeout
            
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            // Handle server-side errors with fallback responses
            if (!data.success && data.fallback_message) {
                handleServerFallback(data);
                return data;
            }
            
            // Success - reset retry count and return
            retryCount = 0;
            updateServiceHealth('network', true);
            return data;
            
        } catch (error) {
            lastError = error;
            logError('network_error', `Attempt ${attempt}: ${error.message}`, { url, attempt });
            
            if (attempt === maxRetries) {
                break;
            }
            
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // All retries failed
    updateServiceHealth('network', false, lastError.message);
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

function handleServerFallback(data) {
    const { error_type, fallback_message, audio_url, fallback_text } = data;
    
    // Display fallback message
    updateChatStatus(`⚠️ ${fallback_message}`, 'warning');
    
    // Show fallback text if no audio
    if (!audio_url && fallback_text) {
        showFallbackText(fallback_text, error_type);
    }
    
    // Show error recovery options
    showErrorRecovery(error_type, data);
    
    // Update chat history with the fallback
    if (data.chat_history) {
        displayChatHistory(data.chat_history);
    }
    
    // Play fallback audio if available
    if (audio_url) {
        playFallbackAudio(audio_url);
    }
}

function showFallbackText(text, errorType) {
    const fallbackDiv = document.getElementById('fallbackText');
    if (fallbackDiv) {
        fallbackDiv.innerHTML = `
            <h4>📝 Text Response (${errorType})</h4>
            <div class="tts-text">${text}</div>
        `;
        fallbackDiv.style.display = 'block';
    }
}

function playFallbackAudio(audioUrl) {
    const audioSection = document.getElementById('chatResponseAudio');
    if (audioSection) {
        audioSection.innerHTML = `
            <h5>🔊 Fallback Audio Response:</h5>
            <audio controls style="width: 100%; margin-top: 10px;" autoplay>
                <source src="${audioUrl}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
    }
}

// Recovery action functions
async function retryCurrentRequest() {
    if (lastFailedRequest) {
        hideErrorRecovery();
        
        if (lastFailedRequest.type === 'chat') {
            await processChatRecording();
        } else if (lastFailedRequest.type === 'tts') {
            await generateAudio();
        }
    }
}

function retryWithDifferentMic() {
    hideErrorRecovery();
    updateChatStatus('🎤 Please check your microphone and try recording again', 'warning');
    // Could implement microphone selection here
}

function switchToTextInput() {
    hideErrorRecovery();
    const textSection = document.querySelector('.section:nth-of-type(2)');
    if (textSection) {
        textSection.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('textInput').focus();
    }
    updateChatStatus('💭 You can use text input below as an alternative', 'success');
}

function simplifyRequest() {
    hideErrorRecovery();
    updateChatStatus('💡 Try asking a simpler question or breaking it into parts', 'warning');
}

function useTextFallback() {
    hideErrorRecovery();
    const fallbackDiv = document.getElementById('fallbackText');
    if (fallbackDiv) {
        fallbackDiv.style.display = 'block';
    }
    updateChatStatus('📝 Audio generation failed, displaying text response', 'warning');
}

function changeTTSVoice() {
    hideErrorRecovery();
    const voiceSelect = document.getElementById('chatVoiceSelect');
    if (voiceSelect) {
        voiceSelect.style.border = '3px solid #ecc94b';
        setTimeout(() => {
            voiceSelect.style.border = '2px solid #e2e8f0';
        }, 3000);
    }
    updateChatStatus('🎭 Try selecting a different voice and retry', 'warning');
}

function checkNetworkConnection() {
    updateChatStatus('🌐 Checking network connectivity...', 'processing');
    
    // Simple connectivity check
    fetch('/health')
        .then(response => {
            if (response.ok) {
                updateChatStatus('✅ Network connection is working', 'success');
                updateConnectionStatus('connected');
            } else {
                throw new Error('Health check failed');
            }
        })
        .catch(error => {
            updateChatStatus('❌ Network connection issues detected', 'error');
            updateConnectionStatus('disconnected');
        });
}

function workOffline() {
    hideErrorRecovery();
    updateChatStatus('📱 Offline mode not yet implemented', 'warning');
    // Could implement offline functionality here
}

function refreshPage() {
    window.location.reload();
}

// Session Management Functions (enhanced with error handling)
function initializeSession() {
    try {
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
    } catch (error) {
        logError('session_init_error', error.message);
        // Create fallback session
        currentSessionId = 'fallback_' + Date.now();
        updateSessionDisplay();
    }
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
    try {
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
        
        // Hide response sections
        document.getElementById('chatResponseSection').style.display = 'none';
        document.getElementById('chatSessionInfo').style.display = 'none';
        
        updateChatStatus('🆕 New conversation started!', 'success');
        hideErrorRecovery();
    } catch (error) {
        logError('new_session_error', error.message);
        updateChatStatus('❌ Failed to create new session', 'error');
    }
}

async function clearCurrentSession() {
    try {
        const response = await makeRobustRequest(`/agent/chat/${currentSessionId}`, {
            method: 'DELETE'
        });
        
        // Clear chat display
        const chatHistory = document.getElementById('chatHistory');
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) chatMessages.innerHTML = '';
        if (chatHistory) chatHistory.style.display = 'none';
        
        // Hide response sections
        document.getElementById('chatResponseSection').style.display = 'none';
        document.getElementById('chatSessionInfo').style.display = 'none';
        
        updateChatStatus('🗑️ Chat history cleared!', 'success');
        hideErrorRecovery();
    } catch (error) {
        logError('clear_session_error', error.message);
        updateChatStatus('❌ Error clearing chat history', 'error');
        showErrorAlert('Failed to clear session', error.message);
    }
}

// Chat History Loading (enhanced with error handling)
async function loadChatHistory() {
    try {
        const response = await makeRobustRequest(`/agent/chat/${currentSessionId}/history`);
        if (response.messages && response.messages.length > 0) {
            displayChatHistory(response.messages);
            displaySessionInfo(response);
        }
    } catch (error) {
        logError('load_history_error', error.message);
        // Don't show error for missing history - it's normal for new sessions
        console.warn('Could not load chat history:', error.message);
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

function displaySessionInfo(sessionData) {
    const sessionInfo = document.getElementById('chatSessionInfo');
    const sessionDetails = document.getElementById('sessionDetails');
    
    if (!sessionDetails) return;
    
    sessionDetails.innerHTML = `
        <strong>Session ID:</strong> ${sessionData.session_id}<br>
        <strong>Message Count:</strong> ${sessionData.message_count}<br>
        <strong>Created:</strong> ${new Date(sessionData.created_at).toLocaleString()}<br>
        <strong>Last Activity:</strong> ${new Date(sessionData.last_activity).toLocaleString()}<br>
        <strong>Errors in Session:</strong> ${sessionData.error_count || 0}
    `;
    
    if (sessionInfo) {
        sessionInfo.style.display = 'block';
    }
}

// Conversational Chat Functions (enhanced with error handling)
async function startChatRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const error = 'Audio recording not supported in this browser';
        logError('microphone_error', error);
        updateChatStatus('❌ ' + error, 'error');
        showErrorAlert('Microphone Error', error);
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(recordedBlob);
            
            const audioPlayer = document.getElementById('chatAudioPlayer');
            audioPlayer.src = audioUrl;
            audioPlayer.style.display = 'block';
            
            // Auto-process the recording
            await processChatRecording();
        };

        mediaRecorder.start();
        isRecording = true;
        conversationMode = true;

        document.getElementById('startChat').disabled = true;
        document.getElementById('stopChat').disabled = false;
        document.getElementById('pauseConversation').style.display = 'inline-block';
        document.getElementById('pauseConversation').disabled = false;

        updateChatStatus('🎙️ Recording your message... Speak now!', 'recording');
        hideErrorRecovery();

    } catch (error) {
        logError('recording_start_error', error.message);
        updateChatStatus('❌ Error accessing microphone. Please check permissions.', 'error');
        showErrorAlert('Microphone Access Error', error.message);
        showErrorRecovery('microphone_error');
    }
}

function stopChatRecording() {
    if (mediaRecorder && isRecording) {
        try {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            isRecording = false;

            document.getElementById('startChat').disabled = false;
            document.getElementById('stopChat').disabled = true;

            updateChatStatus('⏳ Processing your message...', 'processing');
        } catch (error) {
            logError('recording_stop_error', error.message);
            updateChatStatus('❌ Error stopping recording', 'error');
        }
    }
}

function pauseConversation() {
    autoPause = true;
    conversationMode = false;
    
    document.getElementById('pauseConversation').style.display = 'none';
    document.getElementById('startChat').disabled = false;
    
    updateChatStatus('⏸️ Auto-recording paused. Click "Start Conversation" to continue.', 'success');
}

async function processChatRecording() {
    if (!recordedBlob) {
        updateChatStatus('❌ No recording to process', 'error');
        return;
    }

    lastFailedRequest = { type: 'chat', blob: recordedBlob };

    try {
        // Get settings
        const voice = document.getElementById('chatVoiceSelect').value;
        const maxTokens = parseInt(document.getElementById('chatMaxTokens').value);
        const temperature = parseFloat(document.getElementById('chatTemperature').value);

        updateChatStatus('📤 Uploading and processing your message...', 'processing');

        // Create form data
        const formData = new FormData();
        formData.append('audio', recordedBlob, 'chat_recording.webm');
        formData.append('voice', voice);
        formData.append('max_tokens', maxTokens.toString());
        formData.append('temperature', temperature.toString());

        // Send to chat endpoint with robust error handling
        const data = await makeRobustRequest(`/agent/chat/${currentSessionId}`, {
            method: 'POST',
            body: formData
        });
        
        // Display results
        displayChatResponse(data);
        
        // Update chat history
        if (data.chat_history) {
            displayChatHistory(data.chat_history);
        }
        
        // Update session info
        if (data.session_info) {
            displaySessionInfo(data.session_info);
        }

        // Check if this was a fallback response
        if (!data.success) {
            updateChatStatus(`⚠️ ${data.fallback_message}`, 'warning');
        } else {
            updateChatStatus('✅ Message processed successfully!', 'success');
        }

        // Auto-start next recording if in conversation mode and not paused
        if (conversationMode && !autoPause && data.success) {
            setTimeout(() => {
                if (!isRecording && conversationMode && !autoPause) {
                    updateChatStatus('🎙️ Ready for your next message. Starting recording in 2 seconds...', 'processing');
                    setTimeout(() => {
                        if (!isRecording && conversationMode && !autoPause) {
                            startChatRecording();
                        }
                    }, 2000);
                }
            }, 3000); // Wait 3 seconds after AI response
        }

        hideErrorRecovery();

    } catch (error) {
        logError('chat_processing_error', error.message);
        updateChatStatus(`❌ Error processing message: ${error.message}`, 'error');
        showErrorAlert('Chat Processing Error', error.message);
        showErrorRecovery('network_error');
        
        // Show retry button
        document.getElementById('retryLastMessage').style.display = 'inline-block';
        document.getElementById('retryLastMessage').disabled = false;
    }
}

function displayChatResponse(data) {
    // Show response section
    const responseSection = document.getElementById('chatResponseSection');
    const responseText = document.getElementById('chatResponseText');
    const responseAudio = document.getElementById('chatResponseAudio');
    const fallbackText = document.getElementById('fallbackText');

    if (responseText) {
        responseText.textContent = data.ai_response || data.llm_response || data.fallback_message || 'No response generated';
    }
    
    // Handle audio response or fallback
    if (data.audio_url) {
        responseAudio.innerHTML = `
            <audio controls style="width: 100%; margin-top: 10px;" autoplay>
                <source src="${data.audio_url}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
        fallbackText.style.display = 'none';
    } else if (data.fallback_text) {
        showFallbackText(data.fallback_text, data.error_type || 'tts_error');
    }

    if (responseSection) {
        responseSection.style.display = 'block';
    }
}

function retryLastMessage() {
    document.getElementById('retryLastMessage').style.display = 'none';
    processChatRecording();
}

function updateChatStatus(message, type) {
    const status = document.getElementById('chatStatus');
    if (status) {
        status.textContent = message;
        status.className = `status ${type}`;
    }
}

// Enhanced TTS Functions with error handling
async function generateAudio() {
    const text = document.getElementById('textInput').value;
    const voice = document.getElementById('voiceSelect').value;

    if (!text.trim()) {
        updateTTSStatus('❌ Please enter some text', 'error');
        return;
    }

    lastFailedRequest = { type: 'tts', text: text, voice: voice };

    try {
        updateTTSStatus('🔊 Generating audio...', 'processing');

        const data = await makeRobustRequest('/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voice_id: voice
            })
        });
        
        if (data.audio_url) {
            const audioPlayer = document.getElementById('audioPlayer');
            audioPlayer.src = data.audio_url;
            audioPlayer.style.display = 'block';
            audioPlayer.play();
            updateTTSStatus('✅ Audio generated successfully!', 'success');
            hideTTSFallback();
        } else {
            // Show fallback text
            showTTSFallback(data.fallback_text || text, data.error);
            updateTTSStatus(`⚠️ ${data.fallback_message || 'Audio generation failed, showing text'}`, 'warning');
        }
    } catch (error) {
        logError('tts_error', error.message);
        updateTTSStatus(`❌ Error generating audio: ${error.message}`, 'error');
        showTTSFallback(text, error.message);
        showErrorAlert('Text-to-Speech Error', error.message);
        showErrorRecovery('tts_error');
    }
}

function showTTSFallback(text, error) {
    const fallback = document.getElementById('ttsFallback');
    const ttsText = document.getElementById('ttsText');
    
    if (fallback && ttsText) {
        ttsText.textContent = text;
        fallback.style.display = 'block';
    }
}

function hideTTSFallback() {
    const fallback = document.getElementById('ttsFallback');
    if (fallback) {
        fallback.style.display = 'none';
    }
}

function updateTTSStatus(message, type) {
    const status = document.getElementById('ttsStatus');
    if (status) {
        status.textContent = message;
        status.className = `status ${type}`;
    }
}

// Diagnostic Functions
async function runDiagnostics() {
    const resultsDiv = document.getElementById('diagnosticsResults');
    const detailsDiv = document.getElementById('diagnosticsDetails');
    
    if (!resultsDiv || !detailsDiv) return;
    
    resultsDiv.style.display = 'block';
    detailsDiv.innerHTML = 'Running comprehensive diagnostics...<br>';
    
    const diagnostics = {
        network: await testNetworkConnectivity(),
        health: await testHealthEndpoint(),
        browser: testBrowserCapabilities(),
        permissions: await testPermissions()
    };
    
    let diagnosticReport = '<strong>Diagnostic Results:</strong><br><br>';
    
    Object.entries(diagnostics).forEach(([test, result]) => {
        const status = result.success ? '✅' : '❌';
        diagnosticReport += `${status} <strong>${test.toUpperCase()}:</strong> ${result.message}<br>`;
        if (result.details) {
            diagnosticReport += `   Details: ${result.details}<br>`;
        }
        diagnosticReport += '<br>';
    });
    
    diagnosticReport += '<strong>Service Health:</strong><br>';
    Object.entries(serviceHealth).forEach(([service, health]) => {
        const status = health.status === 'healthy' ? '✅' : 
                      health.status === 'error' ? '❌' : '❓';
        diagnosticReport += `${status} ${service.toUpperCase()}: ${health.status} (errors: ${health.errorCount})<br>`;
    });
    
    detailsDiv.innerHTML = diagnosticReport;
}

async function testNetworkConnectivity() {
    try {
        const start = Date.now();
        const response = await fetch('/health');
        const latency = Date.now() - start;
        
        if (response.ok) {
            return {
                success: true,
                message: `Connected (${latency}ms latency)`,
                details: `Response time: ${latency}ms`
            };
        } else {
            return {
                success: false,
                message: `HTTP Error ${response.status}`,
                details: response.statusText
            };
        }
    } catch (error) {
        return {
            success: false,
            message: 'Network connectivity failed',
            details: error.message
        };
    }
}

async function testHealthEndpoint() {
    try {
        const response = await fetch('/health');
        const health = await response.json();
        
        return {
            success: health.status === 'healthy',
            message: `System status: ${health.status}`,
            details: `Services: ${Object.keys(health.services || {}).length}`
        };
    } catch (error) {
        return {
            success: false,
            message: 'Health check failed',
            details: error.message
        };
    }
}

function testBrowserCapabilities() {
    const capabilities = {
        mediaRecorder: !!window.MediaRecorder,
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        webAudio: !!(window.AudioContext || window.webkitAudioContext),
        fetch: !!window.fetch,
        formData: !!window.FormData
    };
    
    const missing = Object.entries(capabilities)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    
    if (missing.length === 0) {
        return {
            success: true,
            message: 'All required capabilities supported',
            details: Object.keys(capabilities).join(', ')
        };
    } else {
        return {
            success: false,
            message: 'Missing browser capabilities',
            details: `Missing: ${missing.join(', ')}`
        };
    }
}

async function testPermissions() {
    try {
        const permissions = await navigator.permissions.query({ name: 'microphone' });
        
        if (permissions.state === 'granted') {
            return {
                success: true,
                message: 'Microphone permission granted',
                details: permissions.state
            };
        } else {
            return {
                success: false,
                message: `Microphone permission: ${permissions.state}`,
                details: 'Please grant microphone access'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: 'Could not check permissions',
            details: error.message
        };
    }
}

async function testSTT() {
    updateDiagnosticStatus('🎤 Testing Speech-to-Text...', 'processing');
    // This would need actual audio test implementation
    updateDiagnosticStatus('ℹ️ STT test requires audio recording', 'warning');
}

async function testLLM() {
    updateDiagnosticStatus('🧠 Testing AI Response...', 'processing');
    try {
        const response = await makeRobustRequest('/llm/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'Hello, this is a test',
                max_tokens: 50,
                temperature: 0.5
            })
        });
        
        if (response.response) {
            updateDiagnosticStatus('✅ LLM test successful', 'success');
        } else {
            updateDiagnosticStatus('❌ LLM test failed', 'error');
        }
    } catch (error) {
        updateDiagnosticStatus(`❌ LLM test error: ${error.message}`, 'error');
    }
}

async function testTTS() {
    updateDiagnosticStatus('🔊 Testing Text-to-Speech...', 'processing');
    try {
        const response = await makeRobustRequest('/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'This is a test of the text to speech system',
                voice_id: 'en-US-natalie'
            })
        });
        
        if (response.audio_url) {
            updateDiagnosticStatus('✅ TTS test successful', 'success');
        } else {
            updateDiagnosticStatus('⚠️ TTS fallback active', 'warning');
        }
    } catch (error) {
        updateDiagnosticStatus(`❌ TTS test error: ${error.message}`, 'error');
    }
}

function updateDiagnosticStatus(message, type) {
    const resultsDiv = document.getElementById('diagnosticsResults');
    const detailsDiv = document.getElementById('diagnosticsDetails');
    
    if (resultsDiv && detailsDiv) {
        resultsDiv.style.display = 'block';
        detailsDiv.innerHTML = `<span class="status ${type}">${message}</span><br>${detailsDiv.innerHTML}`;
    }
}

// Error Log Management
function updateErrorLogDisplay() {
    const errorLogSection = document.querySelector('.error-log-section');
    const errorLogDiv = document.getElementById('errorLog');
    
    if (errorLog.length > 0) {
        errorLogSection.style.display = 'block';
        
        const logEntries = errorLog.slice(-10).map(entry => `
            <div class="error-log-entry">
                <div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                <span class="error-type">${entry.type}</span>
                <strong>${entry.message}</strong>
                ${entry.details ? `<br><small>${entry.details}</small>` : ''}
            </div>
        `).join('');
        
        errorLogDiv.innerHTML = logEntries;
    }
}

function clearErrorLog() {
    errorLog = [];
    const errorLogDiv = document.getElementById('errorLog');
    if (errorLogDiv) {
        errorLogDiv.innerHTML = '<p>No errors recorded in this session.</p>';
    }
    
    const errorLogSection = document.querySelector('.error-log-section');
    if (errorLogSection) {
        errorLogSection.style.display = 'none';
    }
}

function toggleErrorLog() {
    const errorLogSection = document.querySelector('.error-log-section');
    if (errorLogSection) {
        errorLogSection.style.display = errorLogSection.style.display === 'none' ? 'block' : 'none';
    }
}

// Setup error handlers
function setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', function(event) {
        logError('javascript_error', event.message, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        logError('promise_rejection', event.reason?.message || 'Unhandled promise rejection', {
            reason: event.reason
        });
    });
}

// Auto-check system health on page load
window.addEventListener('load', function() {
    setTimeout(() => {
        checkSystemHealth();
    }, 2000);
});
