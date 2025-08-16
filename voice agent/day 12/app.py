from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Path
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
from typing import List, Dict, Any, Optional
import asyncio
import time
import traceback
import json

# Configure comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Error handling logger
error_logger = logging.getLogger('error_handler')
error_logger.setLevel(logging.ERROR)

load_dotenv()

# API Keys with environment variable fallbacks
MURF_API_KEY = os.getenv("MURF_API_KEY") or "ap2_0f754b94-2f6b-4dba-8498-ef39bb26b35e"
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY") or "8958061d558f49819d78dbe4418f1f36"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyCLfWcE-cNv_OUZVHCqyNRAV9Ez45EHxC8"

# Fallback messages for different error scenarios
FALLBACK_MESSAGES = {
    "transcription_error": "I'm having trouble understanding your audio right now. Could you try speaking again or check your microphone?",
    "llm_error": "I'm having trouble connecting to my brain right now. Please try again in a moment.",
    "tts_error": "I'm having trouble with my voice synthesis. Here's my text response instead.",
    "network_error": "I'm experiencing network connectivity issues. Please check your internet connection and try again.",
    "timeout_error": "The request is taking longer than expected. Please try again.",
    "general_error": "I'm experiencing some technical difficulties right now. Please try again in a moment."
}

# Service health tracking
service_health = {
    "assemblyai": {"status": "unknown", "last_check": None, "error_count": 0},
    "gemini": {"status": "unknown", "last_check": None, "error_count": 0},
    "murf": {"status": "unknown", "last_check": None, "error_count": 0}
}

# Initialize clients with error handling
def initialize_clients():
    """Initialize API clients with proper error handling"""
    global client, transcriber, gemini_model
    
    try:
        # Initialize Murf client
        client = Murf(api_key=MURF_API_KEY)
        logger.info("Murf client initialized successfully")
        service_health["murf"]["status"] = "healthy"
    except Exception as e:
        logger.error(f"Failed to initialize Murf client: {str(e)}")
        service_health["murf"]["status"] = "error"
        client = None

    try:
        # Initialize AssemblyAI
        aai.settings.api_key = ASSEMBLYAI_API_KEY
        transcriber = aai.Transcriber()
        logger.info("AssemblyAI client initialized successfully")
        service_health["assemblyai"]["status"] = "healthy"
    except Exception as e:
        logger.error(f"Failed to initialize AssemblyAI client: {str(e)}")
        service_health["assemblyai"]["status"] = "error"
        transcriber = None

    try:
        # Configure Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("Gemini client initialized successfully")
        service_health["gemini"]["status"] = "healthy"
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {str(e)}")
        service_health["gemini"]["status"] = "error"
        gemini_model = None

# Initialize clients
initialize_clients()

app = FastAPI(title="Voice Agent Day 12 - Revamped UI", version="12.0.0")

# Enhanced CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure required directories exist
STATIC_DIR = "static"
TEMPLATES_DIR = "templates"
UPLOAD_DIR = "uploads"

for directory in [STATIC_DIR, TEMPLATES_DIR, UPLOAD_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)
        logger.info(f"Created directory: {directory}")

# Check current working directory and templates
current_dir = os.getcwd()
templates_path = os.path.join(current_dir, TEMPLATES_DIR)
logger.info(f"Current working directory: {current_dir}")
logger.info(f"Templates directory path: {templates_path}")
logger.info(f"Templates directory exists: {os.path.exists(templates_path)}")

if os.path.exists(templates_path):
    template_files = os.listdir(templates_path)
    logger.info(f"Files in templates directory: {template_files}")

# Setup static files and templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Pydantic models for request validation
class TextInput(BaseModel):
    text: str
    voice_id: str = "en-US-natalie"

class LLMQuery(BaseModel):
    query: str
    max_tokens: int = 1000
    temperature: float = 0.7

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_type: str
    fallback_message: Optional[str] = None
    timestamp: str
    session_id: Optional[str] = None

# In-memory chat storage (enhanced with error tracking)
chat_sessions: Dict[str, Dict[str, Any]] = {}

# Error handling utilities
def log_error(error_type: str, error_message: str, session_id: str = None, additional_info: Dict = None):
    """Centralized error logging with context"""
    error_context = {
        "error_type": error_type,
        "error_message": error_message,
        "session_id": session_id,
        "timestamp": datetime.now().isoformat(),
        "additional_info": additional_info or {}
    }
    error_logger.error(f"Error occurred: {json.dumps(error_context, indent=2)}")

def update_service_health(service_name: str, is_healthy: bool, error_message: str = None):
    """Update service health status"""
    if service_name in service_health:
        service_health[service_name]["last_check"] = datetime.now().isoformat()
        if is_healthy:
            service_health[service_name]["status"] = "healthy"
            service_health[service_name]["error_count"] = 0
        else:
            service_health[service_name]["status"] = "error"
            service_health[service_name]["error_count"] += 1
            if error_message:
                service_health[service_name]["last_error"] = error_message

async def safe_transcribe_audio(audio_data: bytes, max_retries: int = 2) -> Dict[str, Any]:
    """Safely transcribe audio with retries and fallback"""
    if not transcriber:
        raise HTTPException(status_code=503, detail="Transcription service unavailable")
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"Transcription attempt {attempt + 1}/{max_retries + 1}")
            start_time = time.time()
            
            # Set timeout for transcription
            transcript = transcriber.transcribe(audio_data)
            
            processing_time = (time.time() - start_time) * 1000
            
            if transcript.status == aai.TranscriptStatus.error:
                error_msg = f"AssemblyAI transcription failed: {transcript.error}"
                update_service_health("assemblyai", False, error_msg)
                if attempt == max_retries:
                    raise HTTPException(status_code=503, detail=error_msg)
                continue
            
            if not transcript.text or transcript.text.strip() == "":
                if attempt == max_retries:
                    raise HTTPException(status_code=400, detail="No speech detected in the audio")
                continue
            
            update_service_health("assemblyai", True)
            return {
                "text": transcript.text.strip(),
                "confidence": transcript.confidence,
                "processing_time": processing_time,
                "attempt": attempt + 1
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_msg = f"Transcription error (attempt {attempt + 1}): {str(e)}"
            logger.error(error_msg)
            update_service_health("assemblyai", False, error_msg)
            
            if attempt == max_retries:
                log_error("transcription_error", error_msg)
                raise HTTPException(
                    status_code=503, 
                    detail=FALLBACK_MESSAGES["transcription_error"]
                )
            
            # Wait before retry
            await asyncio.sleep(1 * (attempt + 1))

async def safe_generate_llm_response(prompt: str, max_tokens: int = 800, temperature: float = 0.7, max_retries: int = 2) -> Dict[str, Any]:
    """Safely generate LLM response with retries and fallback"""
    if not gemini_model:
        raise HTTPException(status_code=503, detail="LLM service unavailable")
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"LLM generation attempt {attempt + 1}/{max_retries + 1}")
            start_time = time.time()
            
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            )
            
            response = gemini_model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            if not response.text:
                if attempt == max_retries:
                    raise HTTPException(status_code=503, detail="No response generated from LLM")
                continue
            
            update_service_health("gemini", True)
            return {
                "text": response.text.strip(),
                "processing_time": processing_time,
                "attempt": attempt + 1
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_msg = f"LLM generation error (attempt {attempt + 1}): {str(e)}"
            logger.error(error_msg)
            update_service_health("gemini", False, error_msg)
            
            if attempt == max_retries:
                log_error("llm_error", error_msg)
                raise HTTPException(
                    status_code=503, 
                    detail=FALLBACK_MESSAGES["llm_error"]
                )
            
            # Wait before retry
            await asyncio.sleep(2 * (attempt + 1))

async def safe_generate_audio(text: str, voice_id: str = "en-US-natalie", max_retries: int = 2) -> Dict[str, Any]:
    """Safely generate audio with retries and fallback"""
    if not client:
        # Return text fallback if TTS is unavailable
        return {
            "audio_url": None,
            "fallback_text": text,
            "error": "TTS service unavailable"
        }
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"TTS generation attempt {attempt + 1}/{max_retries + 1}")
            start_time = time.time()
            
            response = client.text_to_speech.generate(
                text=text,
                voice_id=voice_id
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            update_service_health("murf", True)
            return {
                "audio_url": response.audio_file,
                "processing_time": processing_time,
                "attempt": attempt + 1
            }
            
        except Exception as e:
            error_msg = f"TTS generation error (attempt {attempt + 1}): {str(e)}"
            logger.error(error_msg)
            update_service_health("murf", False, error_msg)
            
            if attempt == max_retries:
                log_error("tts_error", error_msg)
                # Return text fallback instead of failing
                return {
                    "audio_url": None,
                    "fallback_text": text,
                    "error": error_msg,
                    "fallback_message": FALLBACK_MESSAGES["tts_error"]
                }
            
            # Wait before retry
            await asyncio.sleep(1 * (attempt + 1))

# Session management functions
def get_or_create_session(session_id: str) -> Dict[str, Any]:
    """Get existing session or create new one with error tracking"""
    try:
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "last_activity": datetime.now().isoformat(),
                "error_count": 0,
                "last_error": None
            }
            logger.info(f"Created new chat session: {session_id}")
        else:
            chat_sessions[session_id]["last_activity"] = datetime.now().isoformat()
            logger.info(f"Retrieved existing chat session: {session_id} with {len(chat_sessions[session_id]['messages'])} messages")
        
        return chat_sessions[session_id]
    except Exception as e:
        logger.error(f"Error managing session {session_id}: {str(e)}")
        # Create minimal session even if there's an error
        return {
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "error_count": 1,
            "last_error": str(e)
        }

def add_message_to_session(session_id: str, role: str, content: str) -> None:
    """Add message to session with error handling"""
    try:
        session = get_or_create_session(session_id)
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        session["messages"].append(message)
        session["last_activity"] = datetime.now().isoformat()
        logger.info(f"Added {role} message to session {session_id}: {content[:100]}{'...' if len(content) > 100 else ''}")
    except Exception as e:
        logger.error(f"Error adding message to session {session_id}: {str(e)}")

def format_chat_history_for_llm(session_id: str, current_message: str) -> str:
    """Format conversation history for LLM with error handling"""
    try:
        session = get_or_create_session(session_id)
        
        conversation_parts = []
        for message in session["messages"]:
            role = message["role"].title()
            content = message["content"]
            conversation_parts.append(f"{role}: {content}")
        
        # Current message is already added to session, so don't add it again
        # conversation_parts.append(f"User: {current_message}")
        
        formatted_history = "\n".join(conversation_parts)
        logger.info(f"Formatted conversation context ({len(formatted_history)} chars)")
        return formatted_history
        
    except Exception as e:
        logger.error(f"Error formatting chat history for session {session_id}: {str(e)}")
        # Return just current message if history formatting fails
        return f"User: {current_message}"

# API Endpoints with comprehensive error handling

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Home page with error handling"""
    try:
        logger.info("Home endpoint accessed")
        logger.info(f"Looking for template: index.html in {TEMPLATES_DIR}")
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception as e:
        logger.error(f"Error rendering home page: {str(e)}")
        return HTMLResponse(
            content=f"<h1>Voice Agent Day 12</h1><p>Error loading page: {str(e)}</p>",
            status_code=500
        )

@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        overall_status = "healthy"
        issues = []
        
        for service, health in service_health.items():
            if health["status"] == "error":
                overall_status = "degraded"
                issues.append(f"{service}: {health.get('last_error', 'Unknown error')}")
        
        if len(issues) >= 3:
            overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "services": service_health,
            "issues": issues,
            "active_sessions": len(chat_sessions)
        }
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.get("/agent/chat/{session_id}/history")
async def get_chat_history(session_id: str = Path(..., description="The session ID")):
    """Get chat history with error handling"""
    try:
        session = get_or_create_session(session_id)
        return {
            "session_id": session_id,
            "messages": session["messages"],
            "message_count": len(session["messages"]),
            "created_at": session["created_at"],
            "last_activity": session["last_activity"],
            "error_count": session.get("error_count", 0)
        }
    except Exception as e:
        log_error("chat_history_error", str(e), session_id)
        raise HTTPException(status_code=500, detail="Error retrieving chat history")

@app.delete("/agent/chat/{session_id}")
async def clear_chat_session(session_id: str = Path(..., description="The session ID")):
    """Clear chat session with error handling"""
    try:
        if session_id in chat_sessions:
            del chat_sessions[session_id]
            return {"message": f"Chat session {session_id} cleared successfully"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("chat_clear_error", str(e), session_id)
        raise HTTPException(status_code=500, detail="Error clearing chat session")

@app.post("/agent/chat/{session_id}")
async def agent_chat(
    session_id: str = Path(..., description="The session ID for conversation continuity"),
    audio: UploadFile = File(..., description="Audio file containing user's message"),
    voice: str = Form("en-US-natalie", description="Voice ID for TTS response"),
    max_tokens: int = Form(600, description="Maximum tokens for LLM response"),
    temperature: float = Form(0.7, description="Temperature for LLM response")
):
    """
    Conversational AI Chat with Comprehensive Error Handling
    """
    start_time = time.time()
    
    try:
        logger.info(f"Agent chat started for session: {session_id}")
        
        # Step 1: Read and validate audio file
        try:
            audio_data = await audio.read()
            if not audio.content_type or not audio.content_type.startswith('audio/'):
                raise HTTPException(status_code=400, detail="File must be an audio file")
        except Exception as e:
            log_error("audio_read_error", str(e), session_id)
            raise HTTPException(status_code=400, detail="Error reading audio file")
        
        # Step 2: Transcribe audio with retry logic
        try:
            transcription_result = await safe_transcribe_audio(audio_data)
            user_message = transcription_result["text"]
            logger.info(f"Transcription successful: {user_message}")
        except HTTPException as e:
            # Add error message to session for tracking
            add_message_to_session(session_id, "system", f"Transcription failed: {e.detail}")
            
            # Generate fallback audio response
            fallback_audio = await safe_generate_audio(
                FALLBACK_MESSAGES["transcription_error"], 
                voice
            )
            
            session_data = get_or_create_session(session_id)
            session_data["error_count"] = session_data.get("error_count", 0) + 1
            
            return {
                "success": False,
                "error_type": "transcription_error",
                "fallback_message": FALLBACK_MESSAGES["transcription_error"],
                "session_id": session_id,
                "audio_url": fallback_audio.get("audio_url"),
                "fallback_text": fallback_audio.get("fallback_text"),
                "chat_history": session_data["messages"],
                "timestamp": datetime.now().isoformat()
            }
        
        # Step 3: Add user message to session
        add_message_to_session(session_id, "user", user_message)
        
        # Step 4: Format conversation history
        conversation_context = format_chat_history_for_llm(session_id, user_message)
        
        # Step 5: Generate LLM response with retry logic
        try:
            llm_result = await safe_generate_llm_response(
                conversation_context, max_tokens, temperature
            )
            ai_response = llm_result["text"]
            logger.info(f"LLM response generated: {len(ai_response)} characters")
        except HTTPException as e:
            # Add error to session and generate fallback
            add_message_to_session(session_id, "system", f"LLM failed: {e.detail}")
            ai_response = FALLBACK_MESSAGES["llm_error"]
            
            fallback_audio = await safe_generate_audio(ai_response, voice)
            
            session_data = get_or_create_session(session_id)
            session_data["error_count"] = session_data.get("error_count", 0) + 1
            
            return {
                "success": False,
                "error_type": "llm_error",
                "fallback_message": ai_response,
                "session_id": session_id,
                "user_message": user_message,
                "ai_response": ai_response,
                "audio_url": fallback_audio.get("audio_url"),
                "fallback_text": fallback_audio.get("fallback_text"),
                "chat_history": session_data["messages"],
                "timestamp": datetime.now().isoformat()
            }
        
        # Step 6: Add AI response to session
        add_message_to_session(session_id, "assistant", ai_response)
        
        # Step 7: Convert AI response to audio (with fallback)
        logger.info("Converting AI response to audio...")
        audio_result = await safe_generate_audio(ai_response, voice)
        
        # Get updated session data
        session_data = get_or_create_session(session_id)
        total_time = (time.time() - start_time) * 1000
        
        # Prepare response
        response_data = {
            "success": True,
            "session_id": session_id,
            "user_message": user_message,
            "ai_response": ai_response,
            "voice_id": voice,
            "generated_at": datetime.now().isoformat(),
            "total_processing_time": total_time,
            "chat_history": session_data["messages"]
        }
        
        # Add audio or fallback text
        if audio_result.get("audio_url"):
            response_data["audio_url"] = audio_result["audio_url"]
        else:
            response_data["fallback_text"] = audio_result.get("fallback_text", ai_response)
            response_data["tts_error"] = audio_result.get("error")
            response_data["fallback_message"] = audio_result.get("fallback_message")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        # Comprehensive error fallback
        error_msg = f"Unexpected error in agent chat: {str(e)}"
        logger.error(error_msg)
        log_error("agent_chat_error", error_msg, session_id)
        
        # Try to generate fallback audio
        try:
            fallback_audio = await safe_generate_audio(
                FALLBACK_MESSAGES["general_error"], 
                voice
            )
        except:
            fallback_audio = {"audio_url": None, "fallback_text": FALLBACK_MESSAGES["general_error"]}
        
        session_data = get_or_create_session(session_id)
        session_data["error_count"] = session_data.get("error_count", 0) + 1
        
        return {
            "success": False,
            "error_type": "general_error",
            "fallback_message": FALLBACK_MESSAGES["general_error"],
            "session_id": session_id,
            "audio_url": fallback_audio.get("audio_url"),
            "fallback_text": fallback_audio.get("fallback_text"),
            "chat_history": session_data["messages"],
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, workers=1)
