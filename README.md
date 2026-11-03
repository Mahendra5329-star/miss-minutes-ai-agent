# MISS MINUTES AI

A mobile-first, fan-inspired clock assistant website. Includes a CSS animated clock mascot, browser speech input/output, local reminders, app shortcuts, web search, and optional user-controlled local conversation memory.

## Run on Android (frontend demo)
1. Download and extract this ZIP.
2. Open the extracted `index.html` with Chrome, or open the folder in Acode and preview it in Chrome.
3. Allow microphone access if Chrome asks. Voice input uses the browser Speech Recognition API and may require HTTPS.
4. The frontend works in demo mode without an AI key. AI chat requires deployment with the included Vercel function.

## Deploy with AI
1. Create a GitHub repository and upload all files, keeping the `api` folder.
2. Import that repository into Vercel.
3. In Vercel, open Project → Settings → Environment Variables.
4. Add `OPENAI_API_KEY` with your own API key. Optionally add `OPENAI_MODEL` (default `gpt-4.1-mini`).
5. Redeploy the project.
6. Open the deployed HTTPS URL. The browser page calls `/api/chat`; the key stays on the server.

Never put API keys in `app.js`, `index.html`, GitHub, or any public file. API usage may incur charges; check provider pricing and set a budget/usage limit.

## Features and browser limits
- Voice: speech recognition and speech synthesis depend on browser/device support. HTTPS is recommended.
- App launching: shortcuts open official web destinations; Android may offer the matching app. A website cannot silently control or inspect other apps.
- Reminders: stored in this browser's local storage. The site must remain open for reliable timer checks; mobile browsers may pause background tabs. Notifications are permission-based and not guaranteed while the browser is closed.
- Memory: off by default; when enabled, the last 50 chat exchanges are stored locally on this device. Use View or Clear Memory. Clearing browser site data also removes it.
- Web search: opens Google search results in a new tab; it does not scrape or read results automatically.
- 3D mascot: CSS illustration with animation, not a full 3D model.

## Privacy
Do not save sensitive information in local memory. This starter does not send local memory to the AI server; each AI request sends only the current message.
