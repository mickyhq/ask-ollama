# Ask Ollama

A small Vite + React frontend for querying an Ollama-compatible backend.

## What this project does

- Loads installed Ollama models from the backend
- Sends prompts to the backend to generate markdown responses
- Streams Ollama output into the UI
- Uses React for UI state and Vite for development/build tooling

## How the backend is used

The app makes two API calls from `src/components/OllamaChat.jsx`:

- `GET /api/ollama/api/tags` to fetch available models
- `POST /api/ollama/api/generate` to send prompts and stream results

In development, `vite.config.js` proxies `/api/ollama` to `http://localhost:11434`.

## Production backend configuration

You can override the default API path by setting:

```env
VITE_OLLAMA_API_BASE_URL=https://api.example.com/api/ollama
```

When this environment variable is set, the frontend will call:

- `https://api.example.com/api/ollama/api/tags`
- `https://api.example.com/api/ollama/api/generate`

If the variable is omitted, the app defaults to using `/api/ollama`.

## Setup and usage

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Notes

- This frontend is a static React app after build.
- It still requires a running Ollama backend at runtime.
- Use `.env` or `.env.local` to define `VITE_OLLAMA_API_BASE_URL` for production.
