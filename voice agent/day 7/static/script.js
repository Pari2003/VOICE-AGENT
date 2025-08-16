console.log("JavaScript is connected!");

// Variables for Echo Bot functionality
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;

// Text to Speech functionality
async function generateAudio() {
  const text = document.getElementById("textInput").value;
  const voiceId = document.getElementById("voiceSelect").value;

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
      body: JSON.stringify({ text: text, voice_id: voiceId })
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
    
    // Hide action buttons and info sections
    document.getElementById("aiEcho").style.display = "none";
    document.getElementById("uploadRecording").style.display = "none";
    document.getElementById("transcribeRecording").style.display = "none";
    document.getElementById("uploadInfo").style.display = "none";
    document.getElementById("transcriptionResults").style.display = "none";
    document.getElementById("echoResults").style.display = "none";
    document.getElementById("echoAudioSection").style.display = "none";
    clearAllStatuses();
    
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
      
      // Show action buttons
      const aiEchoButton = document.getElementById("aiEcho");
      const uploadButton = document.getElementById("uploadRecording");
      const transcribeButton = document.getElementById("transcribeRecording");
      
      aiEchoButton.style.display = "inline-block";
      uploadButton.style.display = "inline-block";
      transcribeButton.style.display = "inline-block";
      
      aiEchoButton.disabled = false;
      uploadButton.disabled = false;
      transcribeButton.disabled = false;
      
      // Update status
      updateRecordingStatus("Recording complete! You can play, echo with AI, upload, or transcribe your recording.", "ready");
      
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

async function aiEcho() {
  if (!recordedBlob) {
    updateAiEchoStatus("Error: No recording available to echo", "error");
    return;
  }

  const voiceId = document.getElementById("echoVoiceSelect").value;
  
  // Show AI processing status
  updateAiEchoStatus("🤖 AI Echo processing: Transcribing → Converting to AI speech...", "ai-processing");
  
  // Disable AI echo button during processing
  const aiEchoButton = document.getElementById("aiEcho");
  aiEchoButton.disabled = true;

  try {
    // Create FormData with the recorded audio and voice selection
    const formData = new FormData();
    const filename = `recording_${new Date().getTime()}.webm`;
    formData.append('file', recordedBlob, filename);
    formData.append('voice_id', voiceId);

    // Send to AI echo endpoint
    const response = await fetch("http://localhost:8000/tts/echo", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`AI Echo failed with status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      updateAiEchoStatus("✅ AI Echo completed successfully!", "success");
      displayEchoResults(result);
      playEchoAudio(result.echo_audio_url);
      console.log("AI Echo successful:", result);
    } else {
      throw new Error(result.message || "AI Echo failed");
    }

  } catch (error) {
    console.error("AI Echo error:", error);
    updateAiEchoStatus(`❌ AI Echo failed: ${error.message}`, "error");
  } finally {
    // Re-enable AI echo button
    aiEchoButton.disabled = false;
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

async function transcribeRecording() {
  if (!recordedBlob) {
    updateTranscriptionStatus("Error: No recording available to transcribe", "error");
    return;
  }

  // Show transcribing status
  updateTranscriptionStatus("🔄 Transcribing audio with AssemblyAI...", "transcribing");
  
  // Disable transcribe button during transcription
  const transcribeButton = document.getElementById("transcribeRecording");
  transcribeButton.disabled = true;

  try {
    // Create FormData with the recorded audio
    const formData = new FormData();
    const filename = `recording_${new Date().getTime()}.webm`;
    formData.append('file', recordedBlob, filename);

    // Send to transcription endpoint
    const response = await fetch("http://localhost:8000/transcribe/file", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Transcription failed with status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      updateTranscriptionStatus("✅ Audio transcribed successfully!", "success");
      displayTranscriptionResults(result);
      console.log("Transcription successful:", result);
    } else {
      throw new Error(result.message || "Transcription failed");
    }

  } catch (error) {
    console.error("Transcription error:", error);
    updateTranscriptionStatus(`❌ Transcription failed: ${error.message}`, "error");
  } finally {
    // Re-enable transcribe button
    transcribeButton.disabled = false;
  }
}

// Status update functions
function updateRecordingStatus(message, className) {
  const statusDiv = document.getElementById("recordingStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function updateAiEchoStatus(message, className) {
  const statusDiv = document.getElementById("aiEchoStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function updateUploadStatus(message, className) {
  const statusDiv = document.getElementById("uploadStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function updateTranscriptionStatus(message, className) {
  const statusDiv = document.getElementById("transcriptionStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function clearAllStatuses() {
  ["aiEchoStatus", "uploadStatus", "transcriptionStatus"].forEach(id => {
    const statusDiv = document.getElementById(id);
    statusDiv.textContent = "";
    statusDiv.className = "status";
  });
}

// Display functions
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

function displayTranscriptionResults(transcriptionResult) {
  const transcriptionResultsDiv = document.getElementById("transcriptionResults");
  const transcriptionTextDiv = document.getElementById("transcriptionText");
  const transcriptionDetailsDiv = document.getElementById("transcriptionDetails");
  
  // Display the main transcript
  transcriptionTextDiv.textContent = transcriptionResult.transcript || "No speech detected in the audio.";
  
  // Display additional details
  transcriptionDetailsDiv.innerHTML = `
    <ul>
      <li><strong>Confidence:</strong> ${(transcriptionResult.confidence * 100).toFixed(1)}%</li>
      <li><strong>Audio Duration:</strong> ${transcriptionResult.audio_duration ? (transcriptionResult.audio_duration / 1000).toFixed(1) + 's' : 'N/A'}</li>
      <li><strong>Word Count:</strong> ${transcriptionResult.word_count}</li>
      <li><strong>Transcription ID:</strong> ${transcriptionResult.transcription_id}</li>
      <li><strong>Processed Time:</strong> ${new Date(transcriptionResult.transcription_time).toLocaleString()}</li>
      <li><strong>Original Filename:</strong> ${transcriptionResult.original_filename}</li>
    </ul>
  `;
  
  transcriptionResultsDiv.style.display = "block";
}

function displayEchoResults(echoResult) {
  const echoResultsDiv = document.getElementById("echoResults");
  const echoTranscriptDiv = document.getElementById("echoTranscript");
  const echoDetailsDiv = document.getElementById("echoDetails");
  
  // Display the transcript that was echoed
  echoTranscriptDiv.innerHTML = `
    <strong>Original Speech:</strong> "${echoResult.original_transcript}"
  `;
  
  // Display echo details
  echoDetailsDiv.innerHTML = `
    <ul>
      <li><strong>Voice Used:</strong> ${echoResult.voice_id}</li>
      <li><strong>Confidence:</strong> ${(echoResult.confidence * 100).toFixed(1)}%</li>
      <li><strong>Audio Duration:</strong> ${echoResult.audio_duration ? (echoResult.audio_duration / 1000).toFixed(1) + 's' : 'N/A'}</li>
      <li><strong>Word Count:</strong> ${echoResult.word_count}</li>
      <li><strong>Transcription ID:</strong> ${echoResult.transcription_id}</li>
      <li><strong>Processing Time:</strong> ${new Date(echoResult.processing_time).toLocaleString()}</li>
      <li><strong>Original Filename:</strong> ${echoResult.original_filename}</li>
    </ul>
  `;
  
  echoResultsDiv.style.display = "block";
}

function playEchoAudio(audioUrl) {
  const echoAudioSection = document.getElementById("echoAudioSection");
  const echoAudioPlayer = document.getElementById("echoAudioPlayer");
  
  echoAudioPlayer.src = audioUrl;
  echoAudioSection.style.display = "block";
  
  // Auto-play the echo result
  echoAudioPlayer.play().catch(error => {
    console.log("Auto-play prevented:", error);
    // Auto-play might be prevented by browser policies
  });
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
