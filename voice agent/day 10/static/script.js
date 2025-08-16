// Helper to get session_id from URL
function getSessionId() {
    const params = new URLSearchParams(window.location.search);
    let sessionId = params.get('session_id');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 12);
        params.set('session_id', sessionId);
        window.location.search = params.toString();
    }
    return sessionId;
}

const recordBtn = document.getElementById('record-btn');
const chatHistoryDiv = document.getElementById('chat-history');
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

function updateChatHistory(history) {
    chatHistoryDiv.innerHTML = '';
    history.forEach(msg => {
        const div = document.createElement('div');
        div.textContent = `${msg.role === 'user' ? 'You' : 'Bot'}: ${msg.content}`;
        chatHistoryDiv.appendChild(div);
    });
}

function playAudio(url, callback) {
    const audio = new Audio(url);
    audio.onended = callback;
    audio.play();
}

recordBtn.onclick = async () => {
    if (isRecording) {
        mediaRecorder.stop();
        recordBtn.textContent = 'Start Recording';
        isRecording = false;
    } else {
        if (!navigator.mediaDevices) {
            alert('Audio recording not supported');
            return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.wav');
            const sessionId = getSessionId();
            const res = await fetch(`/agent/chat/${sessionId}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            updateChatHistory(data.chat_history);
            playAudio(data.audio_url, () => {
                // Start recording again after bot response played
                recordBtn.click();
            });
        };
        mediaRecorder.start();
        recordBtn.textContent = 'Stop Recording';
        isRecording = true;
    }
};

// On page load, show chat history if any
window.onload = async () => {
    const sessionId = getSessionId();
    // Optionally fetch chat history from server if endpoint exists
};
