from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str = "Multi-Agent Studio"
    version: str = "0.1.0"
    api_prefix: str = "/api"
    frontend_title: str = "Studio de Orquestracao Multiagente"


settings = Settings()
