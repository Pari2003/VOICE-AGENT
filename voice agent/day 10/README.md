# Day 10: Chat History

This app implements a chat history feature for an AI voice agent. Each session stores previous messages, allowing the LLM to remember the conversation. See `app.py` for details.

## Endpoints
- `POST /agent/chat/{session_id}`: Accepts audio, updates chat history, returns LLM response as audio.

## Usage
- Run with `uvicorn app:app --reload`
- Use a frontend that sends audio and session_id, and updates the UI to store session_id in the URL.
