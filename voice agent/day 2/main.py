from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from murf import Murf
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

MURF_API_KEY = os.getenv("MURF_API_KEY") or "ap2_0f754b94-2f6b-4dba-8498-ef39bb26b35e"

client = Murf(api_key=MURF_API_KEY)
app = FastAPI()

# ✅ Allow frontend to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace * with specific origin if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    text: str
    voice_id: str = "en-US-natalie"

@app.post("/generate-audio")
def generate_audio(data: TextInput):
    try:
        response = client.text_to_speech.generate(
            text=data.text,
            voice_id=data.voice_id
        )
        return {"audio_url": response.audio_file}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
