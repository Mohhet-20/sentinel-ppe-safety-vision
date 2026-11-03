from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

ADMIN_USER = settings.DEMO_ADMIN_USERNAME
ADMIN_PASS = settings.DEMO_ADMIN_PASSWORD

print('Attempting login for', ADMIN_USER)
resp = client.post('/api/auth/login', json={'username': ADMIN_USER, 'password': ADMIN_PASS})
print('login status:', resp.status_code)
if resp.status_code != 200:
    print('Login failed:', resp.text)
    raise SystemExit(1)

data = resp.json()
print('tokens present:', 'access_token' in data, 'refresh_token' in data)
access = data['access_token']

# fetch profile
resp2 = client.get('/api/auth/profile', headers={'Authorization': f'Bearer {access}'})
print('profile status:', resp2.status_code)
print(resp2.json())
if resp2.status_code != 200:
    raise SystemExit(1)
print('OK: seeded admin works and profile fetched')
