from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"
    gateway_url: str = "http://localhost:8000"
    gateway_api_key: str
    frontend_origin: str = "http://localhost:3000"

    approval_wait_seconds: int = 120   # how long the agent waits for a human
    approval_poll_seconds: int = 3
    max_tool_calls: int = 12           # budget per run
    max_concurrent_runs: int = 3


settings = Settings()