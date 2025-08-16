console.log("JavaScript is connected!");

// Variables for Echo Bot functionality
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;

// Variables for Voice Conversation functionality
let conversationRecorder;
let conversationChunks = [];
let conversationBlob = null;

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

// Voice-to-Voice Conversation functionality
async function startConversationRecording() {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Clear any previous recordings
    conversationChunks = [];
    conversationBlob = null;
    
    // Hide previous results
    document.getElementById("aiResponseSection").style.display = "none";
    document.getElementById("conversationResults").style.display = "none";
    clearConversationStatus();
    
    // Create MediaRecorder instance
    conversationRecorder = new MediaRecorder(stream);
    
    // Handle data available event
    conversationRecorder.ondataavailable = function(event) {
      if (event.data.size > 0) {
        conversationChunks.push(event.data);
      }
    };
    
    // Handle recording stop event
    conversationRecorder.onstop = function() {
      // Create blob from recorded chunks
      conversationBlob = new Blob(conversationChunks, { type: 'audio/webm' });
      
      // Create URL for the blob
      const audioURL = URL.createObjectURL(conversationBlob);
      
      // Set up audio player
      const conversationAudioPlayer = document.getElementById("conversationAudioPlayer");
      conversationAudioPlayer.src = audioURL;
      conversationAudioPlayer.style.display = "block";
      
      // Start AI conversation processing
      processVoiceConversation();
      
      // Stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop());
    };
    
    // Start recording
    conversationRecorder.start();
    
    // Update UI
    document.getElementById("startConversation").disabled = true;
    document.getElementById("stopConversation").disabled = false;
    updateConversationStatus("🔴 Recording your question... Speak clearly and click 'Stop' when done.", "recording");
    
    console.log("Conversation recording started");
    
  } catch (error) {
    console.error("Error accessing microphone:", error);
    alert("Error accessing microphone. Please make sure you have given permission to use the microphone.");
    updateConversationStatus("Error: Could not access microphone", "error");
  }
}

function stopConversationRecording() {
  if (conversationRecorder && conversationRecorder.state === "recording") {
    conversationRecorder.stop();
    
    // Update UI
    document.getElementById("startConversation").disabled = false;
    document.getElementById("stopConversation").disabled = true;
    updateConversationStatus("⏳ Processing your question... Transcribing and generating AI response...", "conversation-processing");
    
    console.log("Conversation recording stopped");
  }
}

async function processVoiceConversation() {
  if (!conversationBlob) {
    updateConversationStatus("Error: No recording available", "error");
    return;
  }

  const voiceId = document.getElementById("conversationVoiceSelect").value;
  const maxTokens = parseInt(document.getElementById("conversationMaxTokens").value) || 800;
  const temperature = parseFloat(document.getElementById("conversationTemperature").value) || 0.7;
  
  updateConversationStatus("🤖 AI is thinking... Transcribing → Generating response → Converting to speech...", "conversation-processing");

  try {
    // Create FormData with the recorded audio and parameters
    const formData = new FormData();
    const filename = `conversation_${new Date().getTime()}.webm`;
    formData.append('file', conversationBlob, filename);
    formData.append('voice_id', voiceId);
    formData.append('max_tokens', maxTokens.toString());
    formData.append('temperature', temperature.toString());

    // Send to voice-to-voice LLM endpoint
    const response = await fetch("http://localhost:8000/llm/query", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Voice conversation failed with status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      updateConversationStatus("✅ AI conversation completed successfully!", "success");
      displayConversationResults(result);
      playAIResponse(result);
      console.log("Voice conversation successful:", result);
    } else {
      throw new Error(result.message || "Voice conversation failed");
    }

  } catch (error) {
    console.error("Voice conversation error:", error);
    updateConversationStatus(`❌ AI conversation failed: ${error.message}`, "error");
  }
}

function displayConversationResults(result) {
  const conversationResultsDiv = document.getElementById("conversationResults");
  const conversationTranscriptDiv = document.getElementById("conversationTranscript");
  const conversationDetailsDiv = document.getElementById("conversationDetails");
  
  // Display the conversation transcript
  conversationTranscriptDiv.innerHTML = `
    <strong>Your Question:</strong> "${result.query}"
  `;
  
  // Display conversation details
  conversationDetailsDiv.innerHTML = `
    <ul>
      <li><strong>Model:</strong> ${result.model}</li>
      <li><strong>Voice Used:</strong> ${result.voice_id}</li>
      <li><strong>Max Tokens:</strong> ${result.max_tokens}</li>
      <li><strong>Temperature:</strong> ${result.temperature}</li>
      <li><strong>Response Length:</strong> ${result.response_length} characters</li>
      <li><strong>Word Count:</strong> ${result.word_count} words</li>
      <li><strong>Audio Chunks:</strong> ${result.chunk_count} ${result.is_chunked ? '(split due to length)' : ''}</li>
      <li><strong>Generated At:</strong> ${new Date(result.generated_at).toLocaleString()}</li>
      <li><strong>Original Filename:</strong> ${result.original_filename}</li>
    </ul>
  `;
  
  conversationResultsDiv.style.display = "block";
}

function playAIResponse(result) {
  const aiResponseSection = document.getElementById("aiResponseSection");
  const aiResponseTextDiv = document.getElementById("aiResponseText");
  const aiResponseAudioDiv = document.getElementById("aiResponseAudio");
  
  // Display AI response text
  aiResponseTextDiv.textContent = result.response;
  
  // Handle audio playback
  if (result.is_chunked && result.audio_urls && result.audio_urls.length > 1) {
    // Multiple audio chunks
    aiResponseAudioDiv.innerHTML = `
      <h5>🔊 AI Response Audio (${result.chunk_count} parts):</h5>
      <p><em>Response was split into multiple parts due to length. Each part will play automatically.</em></p>
    `;
    
    // Create audio players for each chunk
    result.audio_urls.forEach((audioUrl, index) => {
      const chunkDiv = document.createElement('div');
      chunkDiv.className = 'chunk-player';
      chunkDiv.innerHTML = `
        <h5>Part ${index + 1} of ${result.audio_urls.length}</h5>
        <audio controls preload="auto">
          <source src="${audioUrl}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
      `;
      aiResponseAudioDiv.appendChild(chunkDiv);
    });
    
    // Auto-play the first chunk
    setTimeout(() => {
      const firstAudio = aiResponseAudioDiv.querySelector('audio');
      if (firstAudio) {
        firstAudio.play().catch(error => {
          console.log("Auto-play prevented:", error);
        });
        
        // Set up auto-play for subsequent chunks
        const audios = aiResponseAudioDiv.querySelectorAll('audio');
        audios.forEach((audio, index) => {
          audio.addEventListener('ended', () => {
            if (index + 1 < audios.length) {
              audios[index + 1].play().catch(error => {
                console.log("Auto-play prevented for chunk:", index + 1);
              });
            }
          });
        });
      }
    }, 100);
    
  } else {
    // Single audio file
    const audioUrl = result.audio_url || (result.audio_urls && result.audio_urls[0]);
    aiResponseAudioDiv.innerHTML = `
      <h5>🔊 AI Response Audio:</h5>
      <audio controls preload="auto" style="width: 100%;">
        <source src="${audioUrl}" type="audio/mpeg">
        Your browser does not support the audio element.
      </audio>
    `;
    
    // Auto-play the response
    setTimeout(() => {
      const audio = aiResponseAudioDiv.querySelector('audio');
      if (audio) {
        audio.play().catch(error => {
          console.log("Auto-play prevented:", error);
        });
      }
    }, 100);
  }
  
  aiResponseSection.style.display = "block";
}

// LLM Query functionality (text-based)
async function generateLLMResponse() {
  const query = document.getElementById("llmQueryInput").value;
  const maxTokens = parseInt(document.getElementById("maxTokens").value) || 1000;
  const temperature = parseFloat(document.getElementById("temperature").value) || 0.7;

  if (!query || query.trim() === "") {
    alert("Please enter a query!");
    return;
  }

  // Show loading state
  const button = event.target;
  const originalText = button.textContent;
  button.textContent = "🤖 Thinking...";
  button.disabled = true;

  // Update status
  updateLLMStatus("🧠 Generating AI response with Google Gemini...", "llm-processing");

  try {
    const response = await fetch("http://localhost:8000/llm/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        query: query,
        max_tokens: maxTokens,
        temperature: temperature
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || "LLM query failed");
    }

    updateLLMStatus("✅ AI response generated successfully!", "success");
    displayLLMResults(data);
    console.log("LLM response generated successfully:", data);
    
  } catch (error) {
    console.error("LLM Error:", error);
    updateLLMStatus(`❌ AI response failed: ${error.message}`, "error");
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

function updateLLMStatus(message, className) {
  const statusDiv = document.getElementById("llmStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function updateConversationStatus(message, className) {
  const statusDiv = document.getElementById("conversationStatus");
  statusDiv.textContent = message;
  statusDiv.className = `status ${className}`;
}

function clearConversationStatus() {
  const statusDiv = document.getElementById("conversationStatus");
  statusDiv.textContent = "";
  statusDiv.className = "status";
}

function clearAllStatuses() {
  ["aiEchoStatus", "uploadStatus", "transcriptionStatus", "llmStatus"].forEach(id => {
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

function displayLLMResults(llmResult) {
  const llmResultsDiv = document.getElementById("llmResults");
  const llmResponseDiv = document.getElementById("llmResponse");
  const llmDetailsDiv = document.getElementById("llmDetails");
  
  // Display the AI response
  llmResponseDiv.textContent = llmResult.response;
  
  // Display LLM details
  llmDetailsDiv.innerHTML = `
    <ul>
      <li><strong>Query:</strong> "${llmResult.query}"</li>
      <li><strong>Model:</strong> ${llmResult.model}</li>
      <li><strong>Max Tokens:</strong> ${llmResult.max_tokens}</li>
      <li><strong>Temperature:</strong> ${llmResult.temperature}</li>
      <li><strong>Response Length:</strong> ${llmResult.response_length} characters</li>
      <li><strong>Word Count:</strong> ${llmResult.word_count}</li>
      <li><strong>Generated At:</strong> ${new Date(llmResult.generated_at).toLocaleString()}</li>
    </ul>
  `;
  
  llmResultsDiv.style.display = "block";
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
    updateConversationStatus("Error: Your browser doesn't support audio recording", "error");
    document.getElementById("startRecording").disabled = true;
    document.getElementById("startConversation").disabled = true;
  } else {
    updateRecordingStatus("Ready to record! Click 'Start Recording' to begin.", "ready");
    updateConversationStatus("Ready for voice conversation! Click 'Start Recording Question' to begin.", "ready");
  }
});
