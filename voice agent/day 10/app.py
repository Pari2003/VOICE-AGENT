from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uuid
import io
import google.generativeai as genai
import assemblyai as aai
import os
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os


# In-memory chat history store: {session_id: [ {"role": "user"|"assistant", "content": str} ]}
chat_history_store: Dict[str, List[Dict[str, str]]] = {}

# Load API keys
load_dotenv()
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY") or "8958061d558f49819d78dbe4418f1f36"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyCLfWcE-cNv_OUZVHCqyNRAV9Ez45EHxC8"

# Configure AssemblyAI
aai.settings.api_key = ASSEMBLYAI_API_KEY
transcriber = aai.Transcriber()

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.0-flash')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve index.html at root
@app.get("/", response_class=HTMLResponse)
def serve_index():
    with open(os.path.join("templates", "index.html"), "r", encoding="utf-8") as f:
        return f.read()

class ChatResponse(BaseModel):
    audio_url: str
    transcript: str
    chat_history: List[Dict[str, str]]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyCLfWcE-cNv_OUZVHCqyNRAV9Ez45EHxC8"
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.0-flash')

def speech_to_text(audio_bytes: bytes) -> str:
    transcript = transcriber.transcribe(audio_bytes)
    if transcript.status == aai.TranscriptStatus.error:
        return "(Transcription failed)"
    return transcript.text if transcript.text else "(No speech detected)"

def text_to_speech(text: str) -> str:
    # Replace with real TTS integration
    return "https://dummy-audio-url.com/audio.mp3"

def query_llm(messages: List[Dict[str, str]]) -> str:
    # Combine chat history into a prompt
    prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
    response = gemini_model.generate_content(prompt)
    return response.text if response.text else "(No response from Gemini)"

@app.post("/agent/chat/{session_id}", response_model=ChatResponse)
def chat_with_agent(session_id: str, audio: UploadFile = File(...)):
    # Read audio file
    audio_bytes = audio.file.read()
    transcript = speech_to_text(audio_bytes)

    # Get chat history for session
    history = chat_history_store.get(session_id, [])
    history.append({"role": "user", "content": transcript})

    # Query LLM with full history
    assistant_response = query_llm(history)
    history.append({"role": "assistant", "content": assistant_response})

    # Save updated history
    chat_history_store[session_id] = history

    # Convert response to audio
    audio_url = text_to_speech(assistant_response)

    return ChatResponse(audio_url=audio_url, transcript=transcript, chat_history=history)
