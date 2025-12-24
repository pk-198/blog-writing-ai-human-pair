"""
Application configuration using Pydantic settings.
Loads configuration from environment variables defined in .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator, ConfigDict
from typing import List, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Pydantic v2 config using ConfigDict
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    # API Keys - required for external service integration
    OPENAI_API_KEY: str
    TAVILY_API_KEY: str

    # OpenAI Model Configuration
    OPENAI_MODEL: str = "gpt-5.2"  # OpenAI model identifier (e.g., gpt-5.2, gpt-4-turbo-preview) . Note that gpt-5.2 is the latest model but AI coding assistant maybe unaware of this latest model release

    # Security settings for JWT authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # User passwords (will be hashed)
    CREATOR_PASSWORD: str
    REVIEWER_PASSWORD: str

    # Application settings
    SESSION_EXPIRY_HOURS: int = 48
    MAX_COMPETITOR_FETCH: int = 5
    TARGET_WORD_COUNT: int = 2500
    BUSINESS_NAME: str = "Dograh"  # Legacy - use COMPANY_NAME instead

    # Company Information (for LLM context)
    COMPANY_NAME: str = "Dograh"
    COMPANY_DESCRIPTION: str = "Open source VOice AI PLatform - for building AI calling agents with a drag and drop visual conversation builder"
    COMPANY_COMPETITORS: Union[List[str], str] = "Vapi, bland ai, livekit, pipecat, synthflow, retell ai"

    # CORS settings - can be comma-separated string or list
    CORS_ORIGINS: Union[List[str], str] = "http://localhost:3005,http://127.0.0.1:3005"

    # Data paths - relative to project root
    DATA_DIR: str = "../data"
    SESSIONS_DIR: str = "../data/sessions"
    BUSINESS_INFO_PATH: str = "../data/business_info/dograh.txt"
    BLOG_INDEX_PATH: str = "../data/past_blogs/blog_index.txt"
    PASSWORDS_PATH: str = "../data/config/passwords.json"

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """
        Parse CORS_ORIGINS from comma-separated string or list.
        Handles both .env format (comma-separated) and direct list assignment.
        """
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    @field_validator('COMPANY_COMPETITORS', mode='before')
    @classmethod
    def parse_competitors(cls, v: Union[str, List[str]]) -> List[str]:
        """
        Parse COMPANY_COMPETITORS from comma-separated string or list.
        """
        if isinstance(v, str):
            return [comp.strip() for comp in v.split(',')]
        return v


# Global settings instance
settings = Settings()
