from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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
import textwrap

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

def split_text_for_murf(text: str, max_length: int = 3000) -> list:
    """
    Split text into chunks that fit within Murf's 3000 character limit.
    Tries to split at sentence boundaries for better audio flow.
    """
    if len(text) <= max_length:
        return [text]
    
    # Try to split at sentence boundaries first
    sentences = text.replace('!', '.').replace('?', '.').split('.')
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Add period back (except for last sentence)
        sentence_with_period = sentence + "."
        
        # Check if adding this sentence would exceed the limit
        if len(current_chunk) + len(sentence_with_period) + 1 <= max_length:
            if current_chunk:
                current_chunk += " " + sentence_with_period
            else:
                current_chunk = sentence_with_period
        else:
            # Save current chunk and start new one
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence_with_period
    
    # Add the last chunk
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # If we still have chunks that are too long, split them by words
    final_chunks = []
    for chunk in chunks:
        if len(chunk) <= max_length:
            final_chunks.append(chunk)
        else:
            # Split by words as fallback
            words = chunk.split()
            word_chunk = ""
            for word in words:
                if len(word_chunk) + len(word) + 1 <= max_length:
                    if word_chunk:
                        word_chunk += " " + word
                    else:
                        word_chunk = word
                else:
                    if word_chunk:
                        final_chunks.append(word_chunk)
                    word_chunk = word
            if word_chunk:
                final_chunks.append(word_chunk)
    
    return final_chunks

async def generate_audio_from_chunks(text_chunks: list, voice_id: str) -> list:
    """
    Generate audio for multiple text chunks using Murf API.
    Returns list of audio URLs.
    """
    audio_urls = []
    
    for i, chunk in enumerate(text_chunks):
        try:
            logger.info(f"Generating audio for chunk {i+1}/{len(text_chunks)} ({len(chunk)} chars)")
            response = client.text_to_speech.generate(
                text=chunk,
                voice_id=voice_id
            )
            audio_urls.append(response.audio_file)
            logger.info(f"Successfully generated audio for chunk {i+1}")
        except Exception as e:
            logger.error(f"Error generating audio for chunk {i+1}: {str(e)}")
            # Continue with other chunks even if one fails
            
    return audio_urls

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
async def llm_query(data: LLMQuery = None, file: UploadFile = File(None), voice_id: str = Form("en-US-natalie"), max_tokens: int = Form(1000), temperature: float = Form(0.7)):
    """
    Enhanced LLM Query endpoint: Accept both text and audio input
    If audio is provided, transcribe it first, then send to LLM, then convert response to audio
    """
    try:
        # Determine if this is audio or text input
        if file is not None:
            # Audio input flow
            logger.info("LLM Query with audio input - starting voice-to-voice conversation")
            
            # Step 1: Read and validate audio file
            audio_data = await file.read()
            if not file.content_type or not file.content_type.startswith('audio/'):
                raise HTTPException(status_code=400, detail="File must be an audio file")
            
            # Step 2: Transcribe audio to text
            logger.info("Transcribing audio with AssemblyAI...")
            transcript = transcriber.transcribe(audio_data)
            
            if transcript.status == aai.TranscriptStatus.error:
                raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")
            
            if not transcript.text or transcript.text.strip() == "":
                raise HTTPException(status_code=400, detail="No speech detected in the audio")
            
            query_text = transcript.text
            logger.info(f"Transcription successful: {query_text}")
            
        else:
            # Text input flow (backwards compatibility)
            if data is None:
                raise HTTPException(status_code=400, detail="Either text query or audio file must be provided")
            query_text = data.query
            max_tokens = data.max_tokens
            temperature = data.temperature
            logger.info(f"LLM Query with text input: {query_text[:100]}...")
        
        # Validate input
        if not query_text or query_text.strip() == "":
            raise HTTPException(status_code=400, detail="Query text cannot be empty")
        
        # Step 3: Generate LLM response
        logger.info("Generating response with Gemini API...")
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        
        response = gemini_model.generate_content(
            query_text,
            generation_config=generation_config
        )
        
        if not response.text:
            raise HTTPException(status_code=500, detail="No response generated from Gemini API")
        
        logger.info(f"LLM response generated: {len(response.text)} characters")
        
        # Step 4: If audio input was provided, convert response to audio
        if file is not None:
            logger.info("Converting LLM response to audio...")
            
            # Check if response is too long for Murf (3000 char limit)
            if len(response.text) > 3000:
                logger.info(f"Response too long ({len(response.text)} chars), splitting into chunks")
                text_chunks = split_text_for_murf(response.text, 3000)
                logger.info(f"Split into {len(text_chunks)} chunks")
                
                # Generate audio for all chunks
                audio_urls = await generate_audio_from_chunks(text_chunks, voice_id)
                
                return {
                    "success": True,
                    "message": "Voice-to-voice LLM conversation completed successfully",
                    "query": query_text,
                    "response": response.text,
                    "model": "gemini-2.0-flash",
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "response_length": len(response.text),
                    "word_count": len(response.text.split()),
                    "voice_id": voice_id,
                    "audio_urls": audio_urls,
                    "is_chunked": len(audio_urls) > 1,
                    "chunk_count": len(audio_urls),
                    "generated_at": datetime.now().isoformat(),
                    "original_filename": file.filename
                }
            else:
                # Single audio generation
                murf_response = client.text_to_speech.generate(
                    text=response.text,
                    voice_id=voice_id
                )
                
                return {
                    "success": True,
                    "message": "Voice-to-voice LLM conversation completed successfully",
                    "query": query_text,
                    "response": response.text,
                    "model": "gemini-2.0-flash",
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "response_length": len(response.text),
                    "word_count": len(response.text.split()),
                    "voice_id": voice_id,
                    "audio_url": murf_response.audio_file,
                    "is_chunked": False,
                    "chunk_count": 1,
                    "generated_at": datetime.now().isoformat(),
                    "original_filename": file.filename
                }
        else:
            # Text-only response (backwards compatibility)
            return {
                "success": True,
                "message": "LLM response generated successfully",
                "query": query_text,
                "response": response.text,
                "model": "gemini-2.0-flash",
                "max_tokens": max_tokens,
                "temperature": temperature,
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
