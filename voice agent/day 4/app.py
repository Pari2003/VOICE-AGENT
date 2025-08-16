from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from murf import Murf
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

MURF_API_KEY = os.getenv("MURF_API_KEY") or "ap2_0f754b94-2f6b-4dba-8498-ef39bb26b35e"
client = Murf(api_key=MURF_API_KEY)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/generate-audio", methods=["POST"])
def generate_audio():
    try:
        data = request.get_json()
        text = data.get("text")
        voice_id = data.get("voice_id", "en-US-natalie")
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        response = client.text_to_speech.generate(
            text=text,
            voice_id=voice_id
        )
        return jsonify({"audio_url": response.audio_file})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=8000)
