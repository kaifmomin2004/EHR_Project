# EHR – Local Setup and Run Guide

This project is a full‑stack EHR app:
- Backend: FastAPI (Python), MongoDB Atlas
- Frontend: React + CRACO + Tailwind

## Prerequisites
- Python 3.10+ (Windows/macOS/Linux)
- Node.js 18+ and Yarn 1.x
- Git
- MongoDB Atlas cluster and connection string (mongodb+srv)

## 1) Clone and open
```bash
git clone <your-new-repo-url>
cd EHR
```

## 2) Backend setup (FastAPI)
```powershell
cd backend
python -m venv venv
venv\Scripts\activate   # macOS/Linux: source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create `backend/.env` (do not commit this file):
```env
MONGO_URL="<your-mongodb-atlas-srv-uri>"
DB_NAME=ehr
JWT_SECRET=<generate-a-long-random-secret>
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Run the server:
```powershell
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

## 3) Frontend setup (React)
```powershell
cd frontend
yarn install
```

Create `frontend/.env` (non‑secret config for local dev):
```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

Start the dev server:
```powershell
yarn start
```

Open `http://localhost:3000` in your browser.

## 4) Quick API flow
- Register: `POST /api/auth/register` with email, password, full_name, role
- Login: `POST /api/auth/login` → copy `access_token`
- Auth routes require `Authorization: Bearer <token>`

## 5) Running tests (backend)
```powershell
cd backend
pytest -q
```

## Troubleshooting
- CORS error: ensure `CORS_ORIGINS` in `backend/.env` includes your frontend origin(s) and restart the backend.
- 401 on login: register first, then login with the same email/password.
- `mongodb+srv` URI: requires DNS support (handled via `dnspython`, already in requirements). Ensure Atlas allows your IP under Network Access.
- `bcrypt: no backends available`: install wheel backend packages (already included). If needed: `pip install bcrypt passlib[bcrypt] cffi`.
- Port in use: change ports (`--port 8001`) or stop the conflicting process.

## Environment files and secrets
- Real `.env` files are ignored by Git (see `.gitignore`).
- Commit and share templates only: add `backend/.env.example` and `frontend/.env.example` with placeholder keys.
- Share secrets privately (password managers like 1Password/Bitwarden or a secrets service). Do not commit real secrets.

## Build for production (frontend)
```powershell
cd frontend
yarn build
```
Outputs to `frontend/build/`.

## Notes
- The backend base URL for the frontend is controlled by `REACT_APP_API_BASE_URL`.
- Update CORS when you deploy the frontend (e.g., `CORS_ORIGINS=https://your-frontend.vercel.app`).
