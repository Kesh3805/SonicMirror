# SonicMirror

SonicMirror is an AI-powered Spotify stats and insights app. It analyzes your Spotify listening habits, roasts your music taste, and gives you deep, fun, and sometimes savage insights—all powered by Google Gemini and OpenAI.

## Features
- Spotify OAuth login
- AI-powered roast, mood, and personality analysis
- Music recommendations and playlist creation
- Fun, interactive, and modern UI
- Secure, HTTPS-only (Spotify-compliant)

## Quick Start (Deploy on Render)

### 1. Fork & Clone
Push both `backend` and `frontend` folders to your GitHub repo.

### 2. Deploy Backend
- Go to [Render](https://render.com/), create a new Web Service, and connect your repo.
- Set the root directory to `backend`.
- Set environment variables (see `.env.example` in `backend/`).
- **Important:** Set `SPOTIFY_REDIRECT_URI` to your Render backend URL (e.g., `https://sonicmirror-backend.onrender.com/auth/callback`).
- Set `FRONTEND_URI` to your frontend Render URL (e.g., `https://sonicmirror-frontend.onrender.com/dashboard`).
- Add your backend `/auth/callback` URL to your Spotify Developer Dashboard as a redirect URI.

### 3. Deploy Frontend
- Create a new Static Site (or Web Service for SSR) on Render, set root to `frontend`.
- No special environment variables needed for static export.
- All API calls are already set to use your backend Render URL.

### 4. Configure Spotify
- Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
- Add your backend `/auth/callback` Render URL as a redirect URI.
- Use your client ID and secret in the backend environment variables.

### 5. Environment Variables
See `backend/.env` for all required variables. 

### 6. Usage
- Visit your frontend Render URL.
- Log in with Spotify.
- Enjoy your AI-powered stats, roasts, and recommendations!

## Security Notes
- All tokens are handled securely for MVP. For production, consider moving to HTTP-only cookies.
- Never commit your real `.env` file or secrets to GitHub.

## License
MIT 
