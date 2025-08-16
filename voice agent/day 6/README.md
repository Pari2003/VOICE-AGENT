# Voice Agent - Day 6

A comprehensive voice agent with text-to-speech conversion using Murf API, Echo Bot functionality, audio file upload, and **AI-powered transcription using AssemblyAI**.

## 🚀 New Features in Day 6

### 🔤 AI Speech Transcription

- **AssemblyAI Integration**: Professional-grade speech-to-text conversion
- **New Endpoint**: `/transcribe/file` for audio transcription
- **Real-time Processing**: Direct transcription without saving files
- **Detailed Results**: Confidence scores, word counts, and audio duration
- **Rich UI**: Beautiful transcription display with metadata

### 🎯 Enhanced Workflow

- Record → Play → Upload → **Transcribe**
- No temporary file storage needed for transcription
- Parallel upload and transcription capabilities
- Comprehensive status tracking for all operations

## Features

### 🔊 Text to Speech

- Convert text to speech using Murf API
- High-quality voice synthesis
- Audio playback in the browser

### 🎤 Echo Bot with Upload & Transcription

- Record audio using your microphone
- Real-time recording controls
- Instant playback of recorded audio
- Upload recordings to server
- **NEW**: AI-powered transcription with AssemblyAI
- **NEW**: Detailed transcription analytics

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
2. Click "🔊 Generate Audio"
3. Listen to the generated speech

### Echo Bot with Upload & Transcription

1. Click "🎙️ Start Recording"
2. Allow microphone access if prompted
3. Speak into your microphone
4. Click "⏹️ Stop Recording" when done
5. Your recording will automatically appear - click play to hear it back
6. **Upload**: Click "📤 Upload Recording" to save the file to the server
7. **Transcribe**: Click "📝 Transcribe Audio" to get AI transcription
8. View detailed transcription results with confidence scores and metadata

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

### POST `/transcribe/file` 🆕

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

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: FastAPI with file upload support
- **Audio Recording**: MediaRecorder API
- **File Upload**: FormData with multipart/form-data
- **TTS**: Murf API integration
- **Transcription**: AssemblyAI Python SDK
- **File Storage**: Local filesystem in `/uploads` directory

## Files Structure

```
day 6/
├── app.py                 # FastAPI backend with transcription endpoint
├── requirements.txt       # Python dependencies (includes assemblyai)
├── README.md             # This file
├── uploads/              # Directory for uploaded audio files
├── templates/
│   └── index.html        # Enhanced HTML with transcription UI
└── static/
    ├── style.css         # Enhanced styling with transcription elements
    └── script.js         # JavaScript with transcription functionality
```

## AssemblyAI Features

- **High Accuracy**: State-of-the-art speech recognition
- **Fast Processing**: Optimized for real-time applications
- **Confidence Scores**: Quality metrics for transcription results
- **Multiple Formats**: Supports various audio formats (WebM, MP3, WAV, etc.)
- **Binary Data Support**: Direct processing without file storage

## Browser Compatibility

- Chrome 47+
- Firefox 25+
- Safari 14+
- Edge 79+

Note: Microphone access requires HTTPS in production or localhost for development.

## Troubleshooting

- **Microphone not working**: Ensure you've granted microphone permissions
- **Upload failing**: Check server console for errors and ensure `/uploads` directory exists
- **Transcription failing**: Verify your AssemblyAI API key is correctly configured
- **Low transcription confidence**: Ensure clear audio recording without background noise
- **TTS not working**: Verify your Murf API key is correctly configured
- **CORS errors**: The FastAPI app includes CORS headers for development

## Security Notes

- In production, implement proper file validation and size limits
- Consider adding authentication for file uploads and transcription
- Regularly clean up old files in the uploads directory
- Use proper file type validation beyond content-type checking
- Implement rate limiting for transcription API calls

## API Keys

The application uses the following API keys (included in code for demo):

- **AssemblyAI**: `8958061d558f49819d78dbe4418f1f36`
- **Murf**: `ap2_0f754b94-2f6b-4dba-8498-ef39bb26b35e`

For production use, move these to environment variables.
