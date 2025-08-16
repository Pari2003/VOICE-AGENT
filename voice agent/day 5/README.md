# Voice Agent - Day 5

A comprehensive voice agent with text-to-speech conversion using Murf API, Echo Bot functionality, and audio file upload to server.

## 🚀 New Features in Day 5

### 📤 Audio File Upload

- Upload recorded audio files to the server
- Real-time upload status with progress feedback
- File information display (name, size, content type, upload time)
- Temporary file storage in `/uploads` folder
- Unique filename generation to prevent conflicts

### 🔧 Enhanced Backend

- **FastAPI** instead of Flask for better file handling
- File upload endpoint `/upload-audio`
- Automatic directory creation for uploads
- Comprehensive file metadata response
- Better error handling and validation

## Features

### 🔊 Text to Speech

- Convert text to speech using Murf API
- High-quality voice synthesis
- Audio playback in the browser

### 🎤 Echo Bot with Upload

- Record audio using your microphone
- Real-time recording controls
- Instant playback of recorded audio
- **NEW**: Upload recordings to server
- **NEW**: View detailed upload information

## Setup Instructions

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**

   - Create a `.env` file with your Murf API key:

   ```
   MURF_API_KEY=your_murf_api_key_here
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

### Echo Bot with Upload

1. Click "🎙️ Start Recording"
2. Allow microphone access if prompted
3. Speak into your microphone
4. Click "⏹️ Stop Recording" when done
5. Your recording will automatically appear - click play to hear it back
6. **NEW**: Click "📤 Upload Recording" to send the file to the server
7. **NEW**: View upload details including file size, name, and upload time

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

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: FastAPI with file upload support
- **Audio Recording**: MediaRecorder API
- **File Upload**: FormData with multipart/form-data
- **TTS**: Murf API integration
- **File Storage**: Local filesystem in `/uploads` directory

## Files Structure

```
day 5/
├── app.py                 # FastAPI backend with upload endpoint
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── uploads/              # Directory for uploaded audio files
├── templates/
│   └── index.html        # Enhanced HTML with upload UI
└── static/
    ├── style.css         # Enhanced styling with upload elements
    └── script.js         # JavaScript with upload functionality
```

## Browser Compatibility

- Chrome 47+
- Firefox 25+
- Safari 14+
- Edge 79+

Note: Microphone access requires HTTPS in production or localhost for development.

## Troubleshooting

- **Microphone not working**: Ensure you've granted microphone permissions
- **Upload failing**: Check server console for errors and ensure `/uploads` directory exists
- **File not saving**: Verify write permissions on the uploads directory
- **TTS not working**: Verify your Murf API key is correctly configured
- **CORS errors**: The FastAPI app includes CORS headers for development

## Security Notes

- In production, implement proper file validation and size limits
- Consider adding authentication for file uploads
- Regularly clean up old files in the uploads directory
- Use proper file type validation beyond content-type checking
