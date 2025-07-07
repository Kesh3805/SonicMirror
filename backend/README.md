# SonicMirror Backend

This is the backend for SonicMirror, providing Spotify OAuth, AI endpoints, and all API logic.

## Deployment (Render)
- Deploy as a Node.js Web Service on Render.
- Set all environment variables as shown in `env.example`.
- Spotify and Gemini/OpenAI keys required.

## API Endpoints
- `/auth` - Spotify OAuth
- `/llm` - AI-powered endpoints (roast, mood, recommendations, etc.)
- `/spotify` - Spotify data endpoints

## Environment Variables
See `env.example` for all required variables. Copy to `.env` and fill in your secrets.

## License
MIT 