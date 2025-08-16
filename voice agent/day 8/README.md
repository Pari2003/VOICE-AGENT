# Voice Agent - Day 8: Complete AI Voice Platform with LLM

🎙️ **The Ultimate Voice AI Agent** - A comprehensive voice processing platform with Text-to-Speech, AI Echo Bot, Transcription, and **LLM-powered text generation** using Google Gemini!

## 🌟 Features

### 1. **Text-to-Speech (TTS)**

- Convert any text to natural-sounding speech using Murf API
- Multiple voice options (US/UK, Male/Female)
- High-quality audio generation

### 2. **🧠 AI Text Generation with Google Gemini**

- **NEW!** Ask questions or give prompts to Google's Gemini-2.0-flash model
- Configurable response parameters (max tokens, temperature)
- Smart AI responses for any query or task
- Real-time status updates and detailed response analytics

### 3. **🤖 AI Echo Bot**

- Revolutionary voice transformation technology
- Record your voice → Transcribe with AssemblyAI → Convert to AI voice with Murf
- Multiple AI voice options for echo output
- Complete audio processing pipeline

### 4. **📝 Speech Transcription**

- High-accuracy speech-to-text using AssemblyAI
- Confidence scores and detailed analytics
- Support for various audio formats

### 5. **📤 File Upload & Management**

- Secure audio file upload to server
- File metadata tracking and storage
- Organized uploads directory

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Valid API keys for:
  - **Murf API**: Text-to-Speech generation
  - **AssemblyAI**: Speech transcription
  - **Google Gemini API**: LLM text generation

### Installation

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set up API keys:**
   Create a `.env` file or use the default keys in `app.py`:

   ```
   MURF_API_KEY=your_murf_api_key
   ASSEMBLYAI_API_KEY=your_assemblyai_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Run the server:**

   ```bash
   python app.py
   ```

4. **Open in browser:**
   Navigate to `http://localhost:8000`

## 🛠 API Endpoints

### Core Endpoints

- `GET /` - Main application interface
- `POST /generate-audio` - Text-to-Speech generation
- `POST /upload-audio` - Audio file upload
- `POST /transcribe/file` - Speech transcription
- `POST /tts/echo` - AI Echo Bot (transcribe + TTS)

### 🆕 LLM Endpoint

- `POST /llm/query` - **NEW!** Generate AI text responses using Google Gemini
  ```json
  {
    "query": "Your question or prompt",
    "max_tokens": 1000,
    "temperature": 0.7
  }
  ```

## 🔧 Configuration

### Gemini LLM Settings

- **Model**: `gemini-2.0-flash`
- **Max Tokens**: 100-4000 (configurable)
- **Temperature**: 0.0-2.0 (controls creativity)

### Voice Options

- Natalie (US Female)
- Marcus (US Male)
- Charlotte (US Female)
- Davis (US Male)
- Amelia (UK Female)
- Oliver (UK Male)

## 📊 Technical Stack

- **Backend**: FastAPI with Python
- **Frontend**: HTML5, CSS3, JavaScript
- **AI Services**:
  - Murf API (Text-to-Speech)
  - AssemblyAI (Speech-to-Text)
  - Google Gemini API (LLM)
- **Audio**: MediaRecorder API, WebM format
- **Styling**: Modern gradient design with responsive layout

## 🎯 Use Cases

1. **Voice Assistants**: Build intelligent voice-controlled applications
2. **Content Creation**: Generate AI-powered text and convert to speech
3. **Language Learning**: Practice pronunciation with AI echo feedback
4. **Accessibility**: Voice-to-text and text-to-voice conversion
5. **Creative Writing**: Get AI assistance for content generation
6. **Chatbots**: Create conversational AI with voice capabilities

## 🔐 Security Features

- CORS configuration for secure API access
- File upload validation and sanitization
- Error handling and user feedback
- Secure API key management

## 🆕 What's New in Day 8

- **Google Gemini Integration**: Added powerful LLM capabilities for text generation
- **Enhanced UI**: New LLM query section with configurable parameters
- **Smart Analytics**: Detailed response metrics and processing information
- **Improved Status Updates**: Real-time feedback for all AI operations

## 🎨 User Interface

The application features a beautiful gradient design with:

- **Intuitive Controls**: Easy-to-use buttons and status indicators
- **Real-time Feedback**: Live status updates for all operations
- **Responsive Design**: Works on desktop and mobile devices
- **Modern Styling**: Professional gradient backgrounds and smooth animations

## 📈 Performance

- **Fast Response Times**: Optimized API calls and error handling
- **Efficient Processing**: Parallel processing capabilities where possible
- **Memory Management**: Proper cleanup of audio resources
- **Scalable Architecture**: FastAPI backend ready for production deployment

This is the most advanced version of the Voice Agent, combining the power of speech recognition, text-to-speech, and large language models into one comprehensive platform!
