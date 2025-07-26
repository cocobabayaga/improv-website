from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import time
from datetime import datetime, timedelta
from config import settings
from dotenv import load_dotenv
import os

load_dotenv("../.env")

router = APIRouter()


class TokenResponse(BaseModel):
    token: str
    rtc_url: str
    expires_at: str

#
@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify the API is working"""
    return {
        "status": "ok", 
        "api_key_configured": bool(settings.openai_api_key),
        "api_key_preview": settings.openai_api_key[:10] + "..." if settings.openai_api_key else "None"
    }


@router.post("/token", response_model=TokenResponse)
async def create_ephemeral_token():
    """
    Create an ephemeral token for OpenAI Realtime API access.
    This token is used by the frontend to connect directly to OpenAI's WebRTC endpoint.
    """
    try:
        # Hardcode API key for testing - you should use environment variables in production
        api_key = os.getenv("OPENAI_API_KEY")
        print(api_key)
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        if settings.openai_org_id:
            headers["OpenAI-Organization"] = settings.openai_org_id
        
        payload = {
            "model": "gpt-4o-realtime-preview-2024-10-01",
            "voice": "alloy",
            "instructions": """You are an improv comedy scene partner. Follow these rules:
1. Always say "Yes, and..." - accept what your scene partner offers and build on it
2. Keep responses under 8 seconds of speech 
3. Be witty, playful, and engaging
4. Create characters and scenarios spontaneously
5. Make bold, interesting choices
6. Listen actively and respond to what your partner gives you
7. Have fun and be spontaneous!
Remember: The goal is comedy through collaboration.""",
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500,
                "create_response": True,
                "interrupt_response": True
            }
        }
        
        async with httpx.AsyncClient() as client:
            print(f"Making request to OpenAI...")
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            print(f"OpenAI response status: {response.status_code}")
            print(f"OpenAI response: {response.text}")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"OpenAI API error: {response.text}"
                )
            
            data = response.json()
            
            # Calculate expiration time
            expires_at = datetime.utcnow() + timedelta(seconds=300)
            
            return TokenResponse(
                token=data.get("client_secret", {}).get("value", ""),
                rtc_url=data.get("session", {}).get("rtc_url", ""),
                expires_at=expires_at.isoformat() + "Z"
            )
        
    except Exception as e:
        print(f"Error in token endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
