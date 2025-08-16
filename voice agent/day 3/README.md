# Voice Agent - Day 3

A working voice agent using Flask backend and Murf API for text-to-speech conversion.

## Setup Instructions

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**

   - Copy `.env.template` to `.env`
   - Add your Murf API key to the `.env` file

3. **Run the application:**

   ```bash
   python app.py
   ```

4. **Access the app:**
   - Open your browser and go to `http://localhost:8000`
   - Enter text in the input field
   - Click "🔊 Generate Audio" to convert text to speech

## Features

- ✅ Flask backend with proper CORS configuration
- ✅ Text-to-speech using Murf API
- ✅ Audio playback in the browser
- ✅ Clean UI with loading states
- ✅ Error handling and user feedback

## Files Structure

```
day 3/
├── app.py                 # Flask backend with /generate-audio endpoint
├── requirements.txt       # Python dependencies
├── .env.template         # Environment variables template
├── README.md             # This file
├── templates/
│   └── index.html        # Frontend HTML
└── static/
    ├── style.css         # Styling
    └── script.js         # JavaScript functionality
```

## Troubleshooting

- Make sure you have a valid Murf API key
- Ensure port 8000 is not being used by another application
- Check the browser console for any JavaScript errors
