# Technical Blueprint for a Voice-Driven Comedy Improv Web-App  
*(OpenAI Realtime API, Python / FastAPI backend, WebRTC frontend)*  

Below is a rigorously structured roadmap for developer agents working in VS Code with GitHub Copilot. The plan is split into high-level phases followed by granular task lists and exact technical choices.
This project is a real-time, web-based application that enables users to engage in improvised comedy scenes with a conversational AI partner. The platform leverages advanced speech technologies and modern web protocols to make interactions feel natural and dynamic—just like performing improv with another human, but powered by AI. For the initial MVP create a single page with a single button to start the scene and visual indication that the scene is going.

User Experience Overview
Instant Improv Scenes:
The user arrives at the website and clicks “Start Scene.” This initiates a live, voice-only improvisational performance with an AI scene partner.

Voice-First Conversation:
Users interact entirely through speaking and listening. User speech is captured, transcribed, interpreted by an AI model, and the AI responds via a realistic, synthesized voice.

Natural Turn-Taking:
The conversation is designed to flow as in a real improv scene. The user can “barge in” (interrupt) the AI at any point by speaking, and the AI will immediately adjust—supporting the spontaneity and quick-witted energy central to improvisation.

Live Transcription:
Optionally, the app displays live subtitles/scene transcripts, keeping the interaction accessible and making it easy to follow the evolving performance.

How It Works (Simplified Flow)
Scene Start:
User clicks “Start Scene,” running browser-based audio capture and connection flow.

Audio Exchange:
User speech is streamed to the backend and on to the OpenAI Realtime API for processing.

AI Response:
The AI interprets the scene, generates a creative reply rooted in improv rules, and streams its spoken response back.

Live, Interactive Dialogue:
The user and AI interact in a freeform performance, with each able to interrupt, steer, and escalate the comedy scene in real time.

## Phase 1 – Project Foundations

### 1.1 Repository & Tooling
- Create mono-repo with two top-level dirs: `/backend` (Python) and `/frontend` (TypeScript).
- Enforce formatting and linting: Ruff + Black (backend); ESLint + Prettier (frontend).
- Configure VS Code settings.json to enable GitHub Copilot chat, Pylance, and Volar (for Vue 3) or React tooling.

### 1.2 Environment & Secrets
- Use **direnv** or **doppler** to inject:
  - `OPENAI_API_KEY` (server-side only)
  - `OPENAI_ORG_ID`
  - `ALLOWED_ORIGINS`
- Add `.env.template`; never commit real keys.

### 1.3 Containerisation
- Multi-stage Dockerfile:
  1. Poetry install for backend.
  2. Node 20 for building frontend assets.
- Compose file exposing ports `8000` (API) and `5173` (dev Vite).

## Phase 2 – Backend (FastAPI + Uvicorn)

### 2.1 Core Dependencies
| Purpose | Library | Notes |
|---------|---------|-------|
| ASGI framework | fastapi==0.111 | native WebSocket support[1] |
| WebSocket client to OpenAI | websockets==12.0 | supports binary frames |
| Audio utils | numpy, soundfile | PCM16 conversions |
| VAD fallback | silero-vad-lite | local fallback if needed[2] |
| Auth | python-jose, fastapi-jwt-auth | optional secure endpoints |

### 2.2 Service Layout
```
backend/
 ├── main.py              # FastAPI factory
 ├── api/                 
 │   ├── routes_ws.py     # /ws/client  ❬browser⇄server❭
 │   ├── routes_token.py  # /token      ❬browser⇄server❭
 │   └── deps.py          # DI helpers
 ├── services/
 │   ├── openai_rt.py     # Realtime API wrapper
 │   └── audio.py         # encode/decode, resample
 └── config.py
```

### 2.3 Ephemeral-Key Issuer
1. POST `/token`
2. Backend calls `POST /v1/realtime/sessions` with standard API key[3], receives `{ephemeral_api_key, rtcUrl}`.
3. Return JSON `{token, rtcUrl, expires_at}` to browser.  
   -  TTL ≤60 s (spec), treat as ~5 min pragmatic window[4].

### 2.4 Client Audio Relay (WebRTC Preferred)
- Browser connects directly to `rtcUrl` via WebRTC.
- If older browsers, fallback path: browser → FastAPI WS → OpenAI WS (`wss://api.openai.com/v1/realtime?model=`…).

### 2.5 WebSocket Endpoint `/ws/client`
Steps per connection:
1. Accept, upgrade to `wss` (via TLS termination in Caddy or Nginx)[5].
2. Stream PCM16 chunks from browser; validate 16 kHz mono.
3. Translate to Base64 and forward via `input_audio_buffer.append` events[6].
4. Listen for:
   - `input_audio_buffer.speech_started` → cancel current AI playback (barge-in)[7].
   - `response.audio.delta` → send binary PCM16 frames back to client.

### 2.6 Turn Detection Defaults
```
turn_detection = {
  "type": "server_vad",
  "threshold": 0.60,
  "prefix_padding_ms": 50,
  "silence_duration_ms": 200,
  "create_response": true,
  "interrupt_response": true
}
```
-  Allow agents to override via config; consider `semantic_vad` when released[8].

## Phase 3 – Frontend (React + Vite or Vue 3)

### 3.1 Essential Packages
- `simple-peer` for WebRTC abstraction or raw RTCPeerConnection[3].
- `tone.js` or Web Audio API for input visualisation[9].
- `zod` for runtime type-checking of server payloads.

### 3.2 Connection Flow
1. On “Start Scene” button:
   - Fetch `/token` → token + `rtcUrl`.
   - Call `getUserMedia({audio:{ echoCancellation:true }})`.
   - Create RTCPeerConnection to `rtcUrl`; add mic track.
2. Playback:
   - Remote stream → ``; monitor `ontrack`.
   - Show transcription by parsing `response.text.delta` messages.

### 3.3 Barge-In UX
- Detect local mic energy (Web Audio AnalyserNode).
- If user speaks while AI audio element is >-50 dBFS, send `response.cancel` via data channel[7].

### 3.4 Copilot Tasks
- Ask Copilot to scaffold React hooks: `useRtcSession`, `useAudioMeter`.
- Prompt Copilot to generate TypeScript types from OpenAPI schema.

## Phase 4 – Conversational Logic

### 4.1 System Prompt
```
You are an improv scene partner. Always follow "Yes, and…" rules.
Keep responses under 8 seconds of speech. Speak in first-person character.
```

### 4.2 Function-Calling (Optional)
- Register `tools` in `session.update` e.g. `random_scene_prompt()`.
- When `function_call` detected, backend executes and sends result via `conversation.item.create`[10].

## Phase 5 – Quality, Performance & Security

| Concern | Strategy | Reference |
|---------|----------|-----------|
| Latency | 16 kHz PCM, 20 ms Opus packets; WebRTC ICE Lite STUN only. | [3] |
| Echo / feedback | Browser echoCancellation constraint + Chrome wide-AEC flag awareness[11]. | [11] |
| VAD fallback | Silero VAD stream if OpenAI VAD disabled or in offline mode. | [2] |
| Scaling | Gunicorn workers behind ASGI lifespan, 1 worker per CPU core; use Redis pub-sub for WS load-balancing. | [12] |
| Rate limits | Track `session_id` and throttle to 100 concurrent sessions (API doc). | [13] |

## Phase 6 – Deployment Pipeline

1. GitHub Actions matrix:
   - Lint & test backend (pytest-asyncio).
   - Frontend CI build.
2. Build Docker image; push to GHCR.
3. Deploy to Fly.io or Render with edge regions near target audience.

## Granular Task Checklist

| ID | Task | Owner | Prereq |
|----|------|-------|--------|
| BE-1 | Initialise Poetry project; pin deps | Backend agent | 1.1 |
| BE-2 | Implement `/token` route incl. OpenAI REST call | Backend agent | BE-1 |
| BE-3 | Build `openai_rt.py` wrapper (start, send, read) | Backend agent | BE-2 |
| BE-4 | WebSocket proxy `/ws/client` streaming pipeline | Backend agent | BE-3 |
| FE-1 | Vite scaffold + TLS dev certs | Frontend agent | 1.1 |
| FE-2 | Hook for token fetch & WebRTC connect | Frontend agent | FE-1 |
| FE-3 | Audio meter + barge-in detection | Frontend agent | FE-2 |
| FE-4 | UI components: mic button, transcript panel | Frontend agent | FE-2 |
| SEC-1 | Reverse-proxy TLS (Caddy) with HTTP/2 | DevOps agent | 2.1 |
| QA-1 | Integration tests using Playwright + WebRTC mocks | QA agent | FE-4, BE-4 |
| DEP-1 | GitHub Actions Docker build & Fly deploy | DevOps agent | QA-1 |

## Future Enhancements
1. Swap `server_vad` for `semantic_vad` once generally available[8].
2. Integrate LiveKit Agents for telephony support[14].
3. Add local-LLM fallback (Whisper + TTS) for offline improv jams.

**Follow this blueprint sequentially; each developer agent should tick tasks, commit frequently, and rely on GitHub Copilot for code generation.**

[1] https://docs.livekit.io/agents/build/turns/vad/
[2] https://platform.openai.com/docs/api-reference/realtime-client-events/input_audio_buffer/append
[3] https://docs.livekit.io/reference/python/livekit/plugins/silero/index.html
[4] https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio
[5] https://community.openai.com/t/need-help-being-able-to-interrupt-the-realtime-api-response/972589
[6] https://v03.api.js.langchain.com/interfaces/_langchain_openai.OpenAIClient.Beta.Realtime.InputAudioBufferCommitEvent.html
[7] https://github.com/webrtc/samples/issues/1243
[8] https://dev.to/focused_dot_io/echo-cancellation-with-web-audio-api-and-chromium-1f8m
[9] https://github.com/snakers4/silero-vad/discussions/572
[10] https://platform.openai.com/docs/guides/realtime-conversations
[11] https://www.linkedin.com/learning/openai-api-building-front-end-voice-apps-with-the-realtime-api-and-webrtc/openai-authentication-with-ephemeral-tokens
[12] https://stackoverflow.com/questions/65361686/websockets-bridge-for-audio-stream-in-fastapi
[13] https://openai.com/index/introducing-the-realtime-api/
[14] https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-webrtc
[15] https://platform.openai.com/docs/guides/realtime
[16] https://docs.ag2.ai/docs/blog/2025-01-08-RealtimeAgent-over-websocket/index
[17] https://icseon.com/voice-activity-detection-with-webrtc/
[18] https://www.youtube.com/watch?v=bNMOev4p3_8
[19] https://docs.vapi.ai/openai-realtime
[20] https://github.com/wiseman/py-webrtcvad
[21] https://platform.openai.com/docs/guides/text-to-speech
[22] https://github.com/Honghe/demo_fastapi_websocket
[23] https://spokestack.readthedocs.io/en/latest/spokestack.vad.html
[24] https://learn.microsoft.com/en-us/azure/ai-foundry/openai/realtime-audio-quickstart
[25] https://platform.openai.com/docs/guides/audio
[26] https://google.github.io/adk-docs/streaming/custom-streaming-ws/
[27] https://www.ibm.com/docs/SS4U29/bargein.html
[28] https://platform.openai.com/docs/api-reference/realtime
[29] https://community.openai.com/t/is-realtime-api-directly-speech-to-speech/1089129
[30] https://docs.pipecat.ai/server/services/transport/fastapi-websocket
[31] https://github.com/pyannote/pyannote-audio/issues/604
[32] https://github.com/gbaeke/realtime-webrtc
[33] https://getstream.io/video/docs/python-ai/integrations/silero/
[34] https://docs.livekit.io/agents/v0/integrations/openai/realtime/
[35] https://github.com/daanzu/py-silero-vad-lite
[36] https://docs.livekit.io/agents/openai/overview/
[37] https://github.com/openai/openai-realtime-console
[38] https://cocalc.com/github/snakers4/silero-vad/blob/master/examples/pyaudio-streaming/pyaudio-streaming-examples.ipynb
[39] https://docs.livekit.io/agents/integrations/openai/realtime/
[40] https://platform.openai.com/docs/guides/realtime-webrtc
[41] https://www.youtube.com/watch?v=8pTpx6OuNRs
[42] https://fastapi.tiangolo.com/advanced/websockets/
[43] https://github.com/livekit-examples/realtime-playground
[44] https://learn.microsoft.com/en-us/azure/ai-services/openai/realtime-audio-reference
[45] https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/webrtc-integration.html
[46] https://github.com/openai/openai-realtime-api-beta/issues/94
[47] https://community.openai.com/t/question-about-ephemeral-key-ttl-in-realtime-api/1114627
[48] https://web.dev/patterns/media/microphone-process
[49] https://community.openai.com/t/openai-realtime-api-ephemeral-tokens/1082851
[50] https://github.com/transitive-bullshit/openai-realtime-api/blob/main/src/events.ts
[51] https://stackoverflow.com/questions/51687308/how-to-use-web-audio-api-to-get-raw-pcm-audio
[52] https://pypi.org/project/silero-vad/
[53] https://www.latent.space/p/realtime-api
[54] https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
[55] https://github.com/topics/silero-vad
[56] https://ai.google.dev/gemini-api/docs/ephemeral-tokens
[57] https://indominusbyte.github.io/fastapi-jwt-auth/advanced-usage/websocket/
[58] https://community.openai.com/t/is-it-possible-to-queue-responses-with-realtime-speech/1152950
[59] https://stackoverflow.com/questions/37390574/webrtc-acoustic-echo-cancelation
[60] https://stackoverflow.com/questions/68330775/how-to-make-websocket-secure-wss-connections-in-fastapi
[61] https://github.com/zhiyuan8/FastAPI-websocket-tutorial
[62] https://community.openai.com/t/realtime-api-server-turn-detection-limitations-suggestion-help-request/966610
[63] https://developers.deepgram.com/docs/voice-agent-echo-cancellation
[64] https://github.com/tiangolo/fastapi/issues/5926
[65] https://platform.openai.com/docs/guides/realtime-vad
[66] https://learn.microsoft.com/en-in/answers/questions/2279844/does-azure-support-openai-realtime-api-with-websoc
[67] https://apidog.com/blog/fastapi-websockets/
[68] https://community.openai.com/t/not-able-to-interupt-realtime-ai-response/1250662
[69] https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/echoCancellation