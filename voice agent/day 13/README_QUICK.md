# Voice Agent - Day 12

## 📖 Project Overview

A modern voice-activated AI assistant with real-time speech-to-text, AI conversation, and text-to-speech capabilities. Features a sleek web interface with dark mode, mobile optimization, and seamless conversation flow.

## 🛠️ Technologies Used

### Backend

- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **Google Gemini AI** - Large language model for conversations
- **AssemblyAI** - Speech-to-text transcription
- **Murf AI** - Text-to-speech synthesis

### Frontend

- **Vanilla JavaScript** - Interactive UI logic
- **Modern CSS** - Responsive design with CSS Grid/Flexbox
- **Web Audio API** - Microphone recording
- **Progressive Web App** - Mobile app-like experience

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Browser   │◄──►│   FastAPI Server │◄──►│   AI Services   │
│                 │    │                  │    │                 │
│ • Audio Capture │    │ • Session Mgmt   │    │ • AssemblyAI    │
│ • UI Controls   │    │ • Error Handling │    │ • Gemini AI     │
│ • Dark Mode     │    │ • File Upload    │    │ • Murf TTS      │
│ • Mobile UX     │    │ • Audio Serving  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow

1. **User speaks** → Browser captures audio
2. **Audio sent** → FastAPI server receives WebM file
3. **Transcription** → AssemblyAI converts speech to text
4. **AI Processing** → Gemini AI generates response (max 600 tokens)
5. **Speech Synthesis** → Murf AI converts response to audio
6. **Response** → Browser plays audio and displays text

## ✨ Features

### Core Functionality

- 🎙️ **Voice Recording** - Press & hold to record (minimum 1 second)
- 🤖 **AI Conversations** - Powered by Google Gemini
- 🔊 **Audio Responses** - Natural voice synthesis
- 💬 **Chat History** - Persistent conversation sessions

### User Experience

- 🌙 **Dark/Light Mode** - System preference detection + manual toggle
- 📱 **Mobile Optimized** - Touch-first design with PWA support
- 🔄 **Conversation Mode** - Auto-prompts for continuous chat
- ⚡ **Real-time Feedback** - Recording timer and visual states
- 🛡️ **Error Handling** - Graceful fallbacks for all services

### Technical Features

- 📊 **Session Management** - Unique chat sessions with history
- 🔁 **Retry Logic** - Automatic retry for failed API calls
- 🎯 **Token Limiting** - AI responses capped at 600 tokens
- 🚀 **Performance** - Optimized loading and caching

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the project directory:

```bash
# Required API Keys
MURF_API_KEY=your_murf_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Install Dependencies

```bash
cd "day 12"
pip install -r requirements.txt
```

### 3. Run the Server

```bash
python app.py
```

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:8000
```

## 🔑 API Keys Setup

You need to obtain API keys from these services:

### 1. Murf AI (Text-to-Speech)

- Visit: https://murf.ai/
- Sign up and get your API key
- Set as `MURF_API_KEY`

### 2. AssemblyAI (Speech-to-Text)

- Visit: https://www.assemblyai.com/
- Create account and get API key
- Set as `ASSEMBLYAI_API_KEY`

### 3. Google Gemini AI (Language Model)

- Visit: https://ai.google.dev/
- Get your Gemini API key
- Set as `GEMINI_API_KEY`

## 📱 Usage Guide

### Basic Operation

1. **Allow microphone** access when prompted
2. **Press and hold** the blue microphone button
3. **Speak clearly** (hold for at least 1 second)
4. **Release** to stop recording
5. **Listen** to AI response

### Conversation Mode

1. **Toggle conversation mode** (button in controls)
2. **Record first message** as normal
3. **Wait for AI response** to finish
4. **Button will pulse** when ready for next message
5. **Continue conversation** seamlessly

### Dark Mode

- **Auto-detects** system preference
- **Manual toggle** via moon/sun icon in footer
- **Persistent** across sessions

## 🔧 Configuration

### Voice Settings

- **Voice Selection** - Choose from available TTS voices
- **Creativity Slider** - Adjust AI response creativity (0.0-1.0)

### Session Management

- **Auto-generated** unique session IDs
- **Persistent** chat history during session
- **Health monitoring** with automatic reconnection

## 📂 Project Structure

```
day 12/
├── app.py              # FastAPI server and API endpoints
├── requirements.txt    # Python dependencies
├── static/
│   ├── script.js      # Frontend JavaScript logic
│   └── style.css      # CSS styles and themes
├── templates/
│   └── index.html     # Main web interface
└── uploads/           # Temporary audio file storage
```

## 🚨 Troubleshooting

### Common Issues

**Microphone not working:**

- Check browser permissions
- Ensure HTTPS or localhost
- Try refreshing the page

**No audio playback:**

- Check browser autoplay policies
- Verify speakers/headphones
- Try different browser

**API errors:**

- Verify API keys are correct
- Check internet connection
- Monitor server logs

**Recording too short errors:**

- Hold button for at least 1 second
- Speak clearly into microphone
- Check microphone sensitivity

### Server Logs

Monitor the console output for detailed error information and API call status.

## 📄 License

This project is for educational and demonstration purposes.

---

**Day 12 Voice Agent** - A modern, accessible voice AI interface with seamless conversation flow.
