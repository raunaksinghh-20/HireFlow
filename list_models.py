import os
from google import genai
from dotenv import load_dotenv

load_dotenv("backend/.env")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
for model in client.models.list():
    if "flash" in model.name or "gemini" in model.name:
        print(model.name)
