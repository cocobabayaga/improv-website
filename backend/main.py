from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from api.routes_token import router as token_router
from config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="Improv Comedy Voice App",
        description="Voice-driven comedy improv with OpenAI Realtime API",
        version="0.1.0"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_allowed_origins_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(token_router, prefix="/api", tags=["auth"])
    
    # Serve static files in production
    if settings.environment == "production":
        app.mount("/static", StaticFiles(directory="static"), name="static")
        
        @app.get("/")
        async def serve_frontend():
            return FileResponse("static/index.html")
    
    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}
    
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.environment == "development" else False
    )
