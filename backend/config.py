import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Explicitly load the .env file
load_dotenv()


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_org_id: str = ""
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    environment: str = "development"
    
    def get_allowed_origins_list(self) -> List[str]:
        """Convert comma-separated string to list"""
        return [origin.strip() for origin in self.allowed_origins.split(',') if origin.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
