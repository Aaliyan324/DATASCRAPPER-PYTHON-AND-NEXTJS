from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gemini_api_key: str
    google_maps_api_key: str
    gemini_model: str = "gemini-2.5-flash"
    request_timeout: float = 20.0
    max_search_variants: int = 4
    debug: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
