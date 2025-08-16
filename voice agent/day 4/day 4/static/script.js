console.log("JavaScript is connected!");

// Variables for Echo Bot functionality
let mediaRecorder;
let recordedChunks = [];

// Text to Speech functionality
async function generateAudio() {
  const text = document.getElementById("textInput").value;

  if (!text) {
    alert("Please enter some text!");
    return;
  }

  // Show loading state
  const button = event.target;
  const originalText = button.textContent;
  button.textContent = "⏳ Generating...";
  button.disabled = true;

  try {
    const response = await fetch("http://localhost:8000/generate-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const audioPlayer = document.getElementById("audioPlayer");
    audioPlayer.src = data.audio_url;
    audioPlayer.style.display = "block";
    audioPlayer.play();
    
    console.log("Audio generated successfully:", data.audio_url);
  } catch (error) {
    console.error("Error:", error);
    alert(`Error generating audio: ${error.message}`);
  } finally {
    // Reset button state
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Echo Bot functionality
async function startRecording() {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Clear any previous recordings
    recordedChunks = [];
    
    // Create MediaRecorder instance
    mediaRecorder = new MediaRecorder(stream);
    
    // Handle data available event
    mediaRecorder.ondataavailable = function(event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    // Handle recording stop event
    mediaRecorder.onstop = function() {
      // Create blob from recorded chunks
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      
      // Create URL for the blob
      const audioURL = URL.createObjectURL(blob);
      
      // Set up audio player
      const recordedAudioPlayer = document.getElementById("recordedAudioPlayer");
      recordedAudioPlayer.src = audioURL;
      recordedAudioPlayer.style.display = "block";
      
      // Update status
      updateRecordingStatus("Recording complete! Click play to hear your recording.", "ready");
      
      // Stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop());
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Update UI
    document.getElementById("startRecording").disabled = true;
    document.getElementById("stopRecording").disabled = false;
    updateRecordingStatus("🔴 Recording... Click 'Stop Recording' when done.", "recording");
    
    console.log("Recording started");
    
  } catch (error) {
    console.error("Error accessing microphone:", error);
    alert("Error accessing microphone. Please make sure you have given permission to use the microphone.");
    updateRecordingStatus("Error: Could not access microphone", "");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    
    // Update UI
    document.getElementById("startRecording").disabled = false;
    document.getElementById("stopRecording").disabled = true;
    updateRecordingStatus("⏳ Processing recording...", "");
    
    console.log("Recording stopped");
  }
}

function updateRecordingStatus(message, className) {
  const statusDiv = document.getElementById("recordingStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Check if browser supports MediaRecorder
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateRecordingStatus("Error: Your browser doesn't support audio recording", "");
    document.getElementById("startRecording").disabled = true;
  } else {
    updateRecordingStatus("Ready to record! Click 'Start Recording' to begin.", "ready");
  }
});
