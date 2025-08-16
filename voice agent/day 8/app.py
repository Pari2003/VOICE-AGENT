from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.requests import Request
from pydantic import BaseModel
from murf import Murf
import assemblyai as aai
import google.generativeai as genai
import os
import uuid
import logging
from datetime import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

MURF_API_KEY = os.getenv("MURF_API_KEY") or "ap2_0f754b94-2f6b-4dba-8498-ef39bb26b35e"
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY") or "8958061d558f49819d78dbe4418f1f36"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyCLfWcE-cNv_OUZVHCqyNRAV9Ez45EHxC8"

# Initialize clients
client = Murf(api_key=MURF_API_KEY)
aai.settings.api_key = ASSEMBLYAI_API_KEY
transcriber = aai.Transcriber()

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.0-flash')

app = FastAPI()

# ✅ Allow frontend to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace * with specific origin if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure required directories exist
STATIC_DIR = "static"
TEMPLATES_DIR = "templates"
UPLOAD_DIR = "uploads"
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files and templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Debug: Print current working directory and template path
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Templates directory path: {os.path.abspath(TEMPLATES_DIR)}")
logger.info(f"Templates directory exists: {os.path.exists(TEMPLATES_DIR)}")
if os.path.exists(TEMPLATES_DIR):
    logger.info(f"Files in templates directory: {os.listdir(TEMPLATES_DIR)}")

class TextInput(BaseModel):
    text: str
    voice_id: str = "en-US-natalie"

class LLMQuery(BaseModel):
    query: str
    max_tokens: int = 1000
    temperature: float = 0.7

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    try:
        logger.info("Home endpoint accessed")
        logger.info(f"Looking for template: index.html in {TEMPLATES_DIR}")
        
        # Check if template file exists
        template_path = os.path.join(TEMPLATES_DIR, "index.html")
        if not os.path.exists(template_path):
            logger.error(f"Template file not found: {template_path}")
            raise HTTPException(status_code=500, detail=f"Template file not found: {template_path}")
        
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception as e:
        logger.error(f"Error in home endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Template error: {str(e)}")

@app.post("/generate-audio")
def generate_audio(data: TextInput):
    try:
        logger.info(f"Generate audio endpoint called with text: {data.text}")
        response = client.text_to_speech.generate(
            text=data.text,
            voice_id=data.voice_id
        )
        return {"audio_url": response.audio_file}
    except Exception as e:
        logger.error(f"Error in generate_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    try:
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'webm'
        unique_filename = f"{uuid.uuid4()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save the file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Get file info
        file_size = len(content)
        content_type = file.content_type or "audio/webm"
        
        return {
            "success": True,
            "message": "Audio file uploaded successfully",
            "filename": unique_filename,
            "original_filename": file.filename,
            "content_type": content_type,
            "size": file_size,
            "size_mb": round(file_size / (1024 * 1024), 2),
            "upload_time": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/transcribe/file")
async def transcribe_file(file: UploadFile = File(...)):
    try:
        # Read file content directly into memory
        audio_data = await file.read()
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Transcribe using AssemblyAI
        transcript = transcriber.transcribe(audio_data)
        
        # Check if transcription was successful
        if transcript.status == aai.TranscriptStatus.error:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")
        
        return {
            "success": True,
            "message": "Audio transcribed successfully",
            "transcript": transcript.text,
            "confidence": transcript.confidence,
            "audio_duration": transcript.audio_duration,
            "word_count": len(transcript.text.split()) if transcript.text else 0,
            "transcription_id": transcript.id,
            "transcription_time": datetime.now().isoformat(),
            "original_filename": file.filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/tts/echo")
async def tts_echo(file: UploadFile = File(...), voice_id: str = "en-US-natalie"):
    """
    Enhanced Echo Bot: Transcribe audio and convert back to speech with Murf voice
    """
    try:
        logger.info(f"TTS Echo endpoint called with voice_id: {voice_id}")
        
        # Step 1: Read file content directly into memory
        audio_data = await file.read()
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Step 2: Transcribe using AssemblyAI
        logger.info("Starting transcription with AssemblyAI...")
        transcript = transcriber.transcribe(audio_data)
        
        # Check if transcription was successful
        if transcript.status == aai.TranscriptStatus.error:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")
        
        if not transcript.text or transcript.text.strip() == "":
            raise HTTPException(status_code=400, detail="No speech detected in the audio")
        
        logger.info(f"Transcription successful: {transcript.text}")
        
        # Step 3: Convert transcribed text back to speech using Murf
        logger.info(f"Generating speech with Murf using voice: {voice_id}")
        murf_response = client.text_to_speech.generate(
            text=transcript.text,
            voice_id=voice_id
        )
        
        logger.info("TTS Echo completed successfully")
        
        return {
            "success": True,
            "message": "Audio echoed successfully with AI voice",
            "original_transcript": transcript.text,
            "echo_audio_url": murf_response.audio_file,
            "voice_id": voice_id,
            "confidence": transcript.confidence,
            "audio_duration": transcript.audio_duration,
            "word_count": len(transcript.text.split()),
            "transcription_id": transcript.id,
            "processing_time": datetime.now().isoformat(),
            "original_filename": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in TTS Echo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS Echo failed: {str(e)}")

@app.post("/llm/query")
async def llm_query(data: LLMQuery):
    """
    LLM Query endpoint: Generate AI text responses using Google Gemini
    """
    try:
        logger.info(f"LLM Query endpoint called with query: {data.query[:100]}...")
        
        # Validate input
        if not data.query or data.query.strip() == "":
            raise HTTPException(status_code=400, detail="Query text cannot be empty")
        
        # Generate response using Gemini
        logger.info("Generating response with Gemini API...")
        
        # Configure generation parameters
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=data.max_tokens,
            temperature=data.temperature,
        )
        
        # Generate response
        response = gemini_model.generate_content(
            data.query,
            generation_config=generation_config
        )
        
        # Check if response was generated successfully
        if not response.text:
            raise HTTPException(status_code=500, detail="No response generated from Gemini API")
        
        logger.info("LLM Query completed successfully")
        
        return {
            "success": True,
            "message": "LLM response generated successfully",
            "query": data.query,
            "response": response.text,
            "model": "gemini-2.0-flash",
            "max_tokens": data.max_tokens,
            "temperature": data.temperature,
            "response_length": len(response.text),
            "word_count": len(response.text.split()),
            "generated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in LLM Query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM Query failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
