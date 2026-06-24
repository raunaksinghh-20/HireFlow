from jose import jwt
import os
from datetime import datetime, timedelta, timezone

secret = 'supersecretkey_please_change_in_production_min32chars'
token = jwt.encode({'sub': 'candidate1@gmail.com', 'exp': datetime.now(timezone.utc) + timedelta(minutes=60)}, secret, algorithm='HS256')
import urllib.request
req = urllib.request.Request('http://localhost:8000/api/v1/calendar/my-slots', headers={'Authorization': f'Bearer {token}'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(e)
