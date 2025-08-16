console.log("JavaScript is connected!");

// Variables for Echo Bot functionality
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;

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
    recordedBlob = null;
    
    // Hide upload button and info
    document.getElementById("uploadRecording").style.display = "none";
    document.getElementById("uploadInfo").style.display = "none";
    clearUploadStatus();
    
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
      recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      
      // Create URL for the blob
      const audioURL = URL.createObjectURL(recordedBlob);
      
      // Set up audio player
      const recordedAudioPlayer = document.getElementById("recordedAudioPlayer");
      recordedAudioPlayer.src = audioURL;
      recordedAudioPlayer.style.display = "block";
      
      // Show upload button
      const uploadButton = document.getElementById("uploadRecording");
      uploadButton.style.display = "inline-block";
      uploadButton.disabled = false;
      
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
    updateRecordingStatus("Error: Could not access microphone", "error");
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

async function uploadRecording() {
  if (!recordedBlob) {
    updateUploadStatus("Error: No recording available to upload", "error");
    return;
  }

  // Show uploading status
  updateUploadStatus("📤 Uploading audio file...", "uploading");
  
  // Disable upload button during upload
  const uploadButton = document.getElementById("uploadRecording");
  uploadButton.disabled = true;

  try {
    // Create FormData with the recorded audio
    const formData = new FormData();
    const filename = `recording_${new Date().getTime()}.webm`;
    formData.append('file', recordedBlob, filename);

    // Upload to server
    const response = await fetch("http://localhost:8000/upload-audio", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      updateUploadStatus("✅ Audio uploaded successfully!", "success");
      displayUploadInfo(result);
      console.log("Upload successful:", result);
    } else {
      throw new Error(result.message || "Upload failed");
    }

  } catch (error) {
    console.error("Upload error:", error);
    updateUploadStatus(`❌ Upload failed: ${error.message}`, "error");
  } finally {
    // Re-enable upload button
    uploadButton.disabled = false;
  }
}

function updateRecordingStatus(message, className) {
  const statusDiv = document.getElementById("recordingStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function updateUploadStatus(message, className) {
  const statusDiv = document.getElementById("uploadStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function clearUploadStatus() {
  const statusDiv = document.getElementById("uploadStatus");
  statusDiv.textContent = "";
  statusDiv.className = "status";
}

function displayUploadInfo(uploadResult) {
  const uploadInfoDiv = document.getElementById("uploadInfo");
  const uploadDetailsDiv = document.getElementById("uploadDetails");
  
  uploadDetailsDiv.innerHTML = `
    <ul>
      <li><strong>Filename:</strong> ${uploadResult.filename}</li>
      <li><strong>Original Name:</strong> ${uploadResult.original_filename}</li>
      <li><strong>Content Type:</strong> ${uploadResult.content_type}</li>
      <li><strong>File Size:</strong> ${uploadResult.size_mb} MB (${uploadResult.size.toLocaleString()} bytes)</li>
      <li><strong>Upload Time:</strong> ${new Date(uploadResult.upload_time).toLocaleString()}</li>
    </ul>
  `;
  
  uploadInfoDiv.style.display = "block";
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Check if browser supports MediaRecorder
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateRecordingStatus("Error: Your browser doesn't support audio recording", "error");
    document.getElementById("startRecording").disabled = true;
  } else {
    updateRecordingStatus("Ready to record! Click 'Start Recording' to begin.", "ready");
  }
});
