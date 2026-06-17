import httpx
from fastapi import HTTPException
from app.config.settings import settings

async def transcribe_audio(audio_bytes: bytes, mimetype: str) -> str:
    """
    Transcribe audio bytes using Deepgram STT (nova-3 model).
    """
    if not settings.DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY is missing.")

    url = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true"
    headers = {
        "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
        "Content-Type": mimetype,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, content=audio_bytes, timeout=30.0)

        if response.status_code != 200:
            raise HTTPException(
                status_code=500, 
                detail=f"Deepgram STT Error: {response.text}"
            )

        data = response.json()
        try:
            transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
            return transcript
        except (KeyError, IndexError):
            raise HTTPException(status_code=500, detail="Failed to parse Deepgram response.")


async def generate_tts(text: str) -> bytes:
    """
    Generate audio bytes from text using Deepgram TTS (aura-asteria-en model).
    """
    if not settings.DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY is missing.")

    # Using aura-asteria-en, a natural-sounding female voice
    url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
    headers = {
        "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"text": text}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=30.0)

        if response.status_code != 200:
            raise HTTPException(
                status_code=500, 
                detail=f"Deepgram TTS Error: {response.text}"
            )

        return response.content
