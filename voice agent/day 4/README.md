# Voice Agent - Day 4

A comprehensive voice agent with text-to-speech conversion using Murf API and Echo Bot functionality for audio recording and playback.

## Features

### 🔊 Text to Speech

- Convert text to speech using Murf API
- High-quality voice synthesis
- Audio playback in the browser

### 🎤 Echo Bot

- Record audio using your microphone
- Real-time recording controls
- Instant playback of recorded audio
- Browser-based audio processing

## Setup Instructions

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**

   - Copy `.env.template` to `.env` (if available)
   - Add your Murf API key to the `.env` file

3. **Run the application:**

   ```bash
   python app.py
   ```

4. **Access the app:**
   - Open your browser and go to `http://localhost:8000`
   - Allow microphone access when prompted (for Echo Bot)

## How to Use

### Text to Speech

1. Enter text in the input field
2. Click "🔊 Generate Audio"
3. Listen to the generated speech

### Echo Bot

1. Click "🎙️ Start Recording"
2. Allow microphone access if prompted
3. Speak into your microphone
4. Click "⏹️ Stop Recording" when done
5. Your recording will automatically appear - click play to hear it back

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Flask with CORS support
- **Audio Recording**: MediaRecorder API
- **TTS**: Murf API integration
- **Browser Support**: Modern browsers with MediaRecorder support

## Files Structure

```
day 4/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/
│   └── index.html        # Enhanced HTML with Echo Bot
└── static/
    ├── style.css         # Enhanced styling
    └── script.js         # JavaScript with recording functionality
```

## Browser Compatibility

- Chrome 47+
- Firefox 25+
- Safari 14+
- Edge 79+

Note: Microphone access requires HTTPS in production or localhost for development.

## Troubleshooting

- **Microphone not working**: Ensure you've granted microphone permissions
- **Recording not playing**: Check if your browser supports the WebM audio format
- **TTS not working**: Verify your Murf API key is correctly configured
- **CORS errors**: The Flask app includes CORS headers for development
