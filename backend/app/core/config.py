from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    mongodb_uri: str
    mongodb_db: str = "guardrail"
    redis_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 60
    frontend_origin: str = "http://localhost:3000"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    demo_email: str = ""

settings = Settings()