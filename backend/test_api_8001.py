import os
from dotenv import load_dotenv
load_dotenv("/Users/raunak/Desktop/HireFlow-AI/backend/.env")

from jose import jwt
from datetime import datetime, timedelta, timezone
import urllib.request
import json

secret = os.getenv("SECRET_KEY", "supersecretkey_please_change_in_production_min32chars")
token = jwt.encode({'sub': 'candidate1@gmail.com', 'exp': datetime.now(timezone.utc) + timedelta(minutes=60)}, secret, algorithm='HS256')

req = urllib.request.Request('http://localhost:8001/api/v1/calendar/my-slots', headers={'Authorization': f'Bearer {token}'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(e)
