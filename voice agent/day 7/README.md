# Voice Agent - Day 7

A comprehensive voice agent with text-to-speech conversion using Murf API, Echo Bot functionality, audio file upload, AI-powered transcription using AssemblyAI, and **AI Echo Bot** that repeats your speech in different AI voices!

## 🚀 New Features in Day 7

### 🤖 AI Echo Bot

- **Revolutionary Echo**: Instead of playing back your original recording, the AI Echo Bot:
  1. 📝 **Transcribes** your speech using AssemblyAI
  2. 🎤 **Converts** the transcript back to speech using Murf AI
  3. 🔊 **Plays** the result in a selected AI voice
- **Voice Selection**: Choose from 6 different AI voices for the echo
- **New Endpoint**: `/tts/echo` combines transcription + text-to-speech
- **Enhanced UI**: Beautiful gradient styling for AI features
- **Dual Audio Players**: Compare your original recording with the AI echo

### 🎯 Enhanced Workflow

- Record → AI Echo (transcribe + re-synthesize)
- Record → Upload (save to server)
- Record → Transcribe (text analysis)
- All operations can be performed independently

## Features

### 🔊 Text to Speech

- Convert text to speech using Murf API
- Voice selection dropdown with 6 AI voices
- High-quality voice synthesis
- Audio playback in the browser

### 🎤 Advanced Echo Bot

- Record audio using your microphone
- Real-time recording controls
- **AI Echo**: Transcribe and re-synthesize in AI voice
- Upload recordings to server
- Traditional transcription with detailed analytics
- Multiple voice options for AI echo

## Available AI Voices

- **Natalie** (US Female)
- **Marcus** (US Male)
- **Charlotte** (US Female)
- **Davis** (US Male)
- **Amelia** (UK Female)
- **Oliver** (UK Male)

## Setup Instructions

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Create a `.env` file with your API keys:

   ```
   MURF_API_KEY=your_murf_api_key_here
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
   ```

3. **Run the application:**

   ```bash
   python app.py
   ```

   Or using uvicorn directly:

   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Access the app:**
   - Open your browser and go to `http://localhost:8000`
   - Allow microphone access when prompted (for Echo Bot)

## How to Use

### Text to Speech

1. Enter text in the input field
2. Select desired AI voice from dropdown
3. Click "🔊 Generate Audio"
4. Listen to the generated speech

### AI Echo Bot

1. **Select Echo Voice**: Choose which AI voice you want for the echo
2. **Record**: Click "🎙️ Start Recording" → Speak → Click "⏹️ Stop Recording"
3. **AI Echo**: Click "🤖 AI Echo" to hear your speech in the selected AI voice
4. **Compare**: Listen to both your original recording and the AI echo
5. **Optional**: Also upload or transcribe the recording for analysis

## API Endpoints

### POST `/generate-audio`

Generate speech from text using Murf API.

**Request:**

```json
{
  "text": "Hello world",
  "voice_id": "en-US-natalie"
}
```

**Response:**

```json
{
  "audio_url": "https://..."
}
```

### POST `/upload-audio`

Upload an audio file to the server.

**Request:** Multipart form data with `file` field

**Response:**

```json
{
  "success": true,
  "message": "Audio file uploaded successfully",
  "filename": "uuid_timestamp.webm",
  "original_filename": "recording.webm",
  "content_type": "audio/webm",
  "size": 12345,
  "size_mb": 0.01,
  "upload_time": "2024-01-01T12:00:00"
}
```

### POST `/transcribe/file`

Transcribe an audio file using AssemblyAI.

**Request:** Multipart form data with `file` field

**Response:**

```json
{
  "success": true,
  "message": "Audio transcribed successfully",
  "transcript": "Hello, this is a test recording.",
  "confidence": 0.95,
  "audio_duration": 3250,
  "word_count": 6,
  "transcription_id": "assemblyai_id",
  "transcription_time": "2024-01-01T12:00:00",
  "original_filename": "recording.webm"
}
```

### POST `/tts/echo` 🆕

AI Echo Bot: Transcribe audio and convert back to AI speech.

**Request:** Multipart form data with `file` field and optional `voice_id` parameter

**Response:**

```json
{
  "success": true,
  "message": "Audio echoed successfully with AI voice",
  "original_transcript": "Hello, this is a test recording.",
  "echo_audio_url": "https://murf.ai/...",
  "voice_id": "en-US-natalie",
  "confidence": 0.95,
  "audio_duration": 3250,
  "word_count": 6,
  "transcription_id": "assemblyai_id",
  "processing_time": "2024-01-01T12:00:00",
  "original_filename": "recording.webm"
}
```

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: FastAPI with file upload support
- **Audio Recording**: MediaRecorder API
- **File Upload**: FormData with multipart/form-data
- **TTS**: Murf API integration
- **Transcription**: AssemblyAI Python SDK
- **AI Pipeline**: AssemblyAI → Murf API for voice transformation

## Files Structure

```
day 7/
├── app.py                 # FastAPI backend with AI echo endpoint
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── uploads/              # Directory for uploaded audio files
├── templates/
│   └── index.html        # Enhanced HTML with AI Echo UI
└── static/
    ├── style.css         # Enhanced styling with AI gradients
    └── script.js         # JavaScript with AI Echo functionality
```

## Browser Compatibility

- Chrome 47+
- Firefox 25+
- Safari 14+
- Edge 79+

Note: Microphone access requires HTTPS in production or localhost for development.

## Demo for LinkedIn

**Perfect Demo Script:**

1. **Open the app** and show the interface
2. **Record a message**: "Hello LinkedIn! This is my AI Echo Bot in action."
3. **Select different voices** (Marcus, Amelia, Oliver) and demonstrate the AI Echo
4. **Show the transcription** to prove it's working end-to-end
5. **Highlight the technology stack**: AssemblyAI + Murf API + FastAPI

**Key Points to Mention:**

- ✅ Real-time speech-to-text transcription
- ✅ AI voice synthesis with multiple voice options
- ✅ End-to-end voice transformation pipeline
- ✅ Modern web technologies (FastAPI, JavaScript)
- ✅ Professional API integrations (AssemblyAI, Murf)

## Troubleshooting

- **Microphone not working**: Ensure you've granted microphone permissions
- **AI Echo failing**: Check both AssemblyAI and Murf API keys
- **No speech detected**: Speak clearly and ensure good audio quality
- **Upload failing**: Check server console for errors
- **TTS not working**: Verify your Murf API key is correctly configured
- **CORS errors**: The FastAPI app includes CORS headers for development

## API Keys

The application uses the following API keys (included in code for demo):

- **AssemblyAI**: `8958061d558f49819d78dbe4418f1f36`
- **Murf**: `ap2_0f754b94-2f6b-4dba-8498-ef39bb26b35e`

For production use, move these to environment variables.

## What Makes This Special

🤖 **AI Voice Transformation**: Unlike simple audio playback, this creates a true AI voice clone of your speech
🎭 **Voice Variety**: Experience your words in different accents and genders
🔬 **Technology Showcase**: Demonstrates cutting-edge AI APIs working together
🚀 **Professional Quality**: Production-ready code with proper error handling
📱 **Modern UI**: Beautiful, responsive interface with smooth animations
