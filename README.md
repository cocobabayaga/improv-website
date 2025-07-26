# Improv Comedy Voice App

A real-time, voice-driven comedy improv web application powered by OpenAI's Realtime API. Users can engage in improvisational comedy scenes with an AI scene partner through natural voice interactions.

## Features

- **Voice-First Interaction**: Speak directly to start and participate in improv scenes
- **Real-Time AI Response**: Immediate AI responses following improv "Yes, and..." principles  
- **Natural Turn-Taking**: Interrupt and respond naturally like in real improv
- **Live Visual Feedback**: Visual indicators for scene status and activity
- **WebRTC Integration**: Low-latency audio streaming for natural conversation flow

## Tech Stack

- **Backend**: Python, FastAPI, WebSockets
- **Frontend**: React, TypeScript, Vite
- **AI**: OpenAI Realtime API with WebRTC
- **Deployment**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Poetry (for Python dependency management)
- OpenAI API key with Realtime API access

### Development Setup

1. **Clone and setup environment**:
   ```bash
   git clone <repository-url>
   cd improv-website
   ```

2. **Backend setup**:
   ```bash
   cd backend
   cp .env.template .env
   # Edit .env with your OpenAI API key
   poetry install
   poetry run python main.py
   ```

3. **Frontend setup** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Using Docker

```bash
# Copy environment template
cp backend/.env.template backend/.env
# Edit backend/.env with your OpenAI API key

# Run with Docker Compose
docker-compose up --build
```

## Usage

1. **Open the application** in your web browser
2. **Click "Start Scene"** to begin an improv session
3. **Allow microphone access** when prompted
4. **Start talking!** The AI will respond and engage in the improv scene
5. **Interrupt naturally** - the AI will adapt to your input in real-time
6. **Click "Stop Scene"** when you're done

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORG_ID=your_organization_id_here
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVIRONMENT=development
```

## Architecture

### Backend (FastAPI)
- `/api/token` - Generates ephemeral tokens for OpenAI Realtime API
- WebSocket support for real-time audio streaming
- CORS configuration for frontend integration

### Frontend (React)
- React hooks for managing scene state and WebRTC connections
- Real-time audio capture and playback
- Visual feedback for connection status and scene activity

### Integration Flow
1. Frontend requests ephemeral token from backend
2. Frontend establishes WebRTC connection to OpenAI
3. Audio streams bidirectionally for real-time conversation
4. AI responds following improv comedy principles

## Development

### Code Structure

```
improv-website/
├── backend/
│   ├── api/
│   │   └── routes_token.py      # Token generation endpoint
│   ├── services/                # Core business logic
│   ├── config.py               # Configuration management
│   └── main.py                 # FastAPI application
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   └── types.ts            # TypeScript type definitions
│   └── package.json
└── docker-compose.yml
```

### Key Components

- **SceneControls**: Main UI component for starting/stopping scenes
- **useImprovScene**: React hook managing WebRTC and scene state
- **Token API**: Secure ephemeral token generation for OpenAI access

## Deployment

The application is containerized and ready for deployment to platforms like:
- Fly.io
- Render
- Railway
- Any Docker-compatible hosting service

### Production Considerations

- Enable HTTPS for WebRTC functionality
- Configure proper CORS origins
- Set up monitoring and logging
- Implement rate limiting for API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built following the technical blueprint for OpenAI Realtime API integration
- Inspired by improv comedy principles and "Yes, and..." methodology
- Uses WebRTC for low-latency real-time audio communication
