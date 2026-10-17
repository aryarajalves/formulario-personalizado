import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Projeto Base"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")

    def __init__(self, **values):
        super().__init__(**values)
        if self.DATABASE_URL.startswith("postgresql://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecret-jwt-key-projeto-base-981273491")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Pepper for password hashing (kept secret on the server)
    SECURITY_PASSWORD_PEPPER: str = os.getenv("SECURITY_PASSWORD_PEPPER", "custom-pepper-salt-projeto-base-secure-key-2026")

    # Super Admin credentials from ENV
    SUPERADMIN_EMAIL: str = os.getenv("SUPERADMIN_EMAIL", "aryarajmarketing@gmail.com")
    SUPERADMIN_PASSWORD: str = os.getenv("SUPERADMIN_PASSWORD", "SuperAdmin@2026!")
    SUPERADMIN_NAME: str = os.getenv("SUPERADMIN_NAME", "Super Admin")

    # Brevo Email API
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL: str = os.getenv("BREVO_SENDER_EMAIL", "")
    BREVO_SENDER_NAME: str = os.getenv("BREVO_SENDER_NAME", "Projeto Base")

    # Backblaze B2 / AWS S3 Configs para Backup Automático (Suporta tanto B2_* quanto BACKBLAZE_*)
    B2_ENDPOINT_URL: str = os.getenv("BACKBLAZE_ENDPOINT_URL") or os.getenv("B2_ENDPOINT_URL", "")
    B2_KEY_ID: str = os.getenv("BACKBLAZE_KEY_ID") or os.getenv("B2_KEY_ID", "")
    B2_APPLICATION_KEY: str = os.getenv("BACKBLAZE_APPLICATION_KEY") or os.getenv("B2_APPLICATION_KEY", "")
    B2_BUCKET_NAME: str = os.getenv("BACKBLAZE_BUCKET_NAME") or os.getenv("B2_BUCKET_NAME", "")
    BACKBLAZE_CDN_URL: str = os.getenv("BACKBLAZE_CDN_URL", "")
    B2_FOLDER: str = os.getenv("B2_FOLDER", "projetobase/backups/")
    B2_RETENTION_MAX: int = int(os.getenv("B2_RETENTION_MAX", "30"))

    # Google Calendar OAuth 2.0
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/forms/integrations/google-calendar/callback")

    # Rate Limiting (Requisições por minuto por IP)
    RATE_LIMIT_LOGIN: int = int(os.getenv("RATE_LIMIT_LOGIN", "5"))
    RATE_LIMIT_REGISTER: int = int(os.getenv("RATE_LIMIT_REGISTER", "3"))
    RATE_LIMIT_VERIFY_OTP: int = int(os.getenv("RATE_LIMIT_VERIFY_OTP", "5"))
    RATE_LIMIT_PUBLIC_FORMS: int = int(os.getenv("RATE_LIMIT_PUBLIC_FORMS", "30"))
    RATE_LIMIT_AUTHENTICATED: int = int(os.getenv("RATE_LIMIT_AUTHENTICATED", "200"))

    # CORS Granular (Lista de domínios separados por vírgula)
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002")

    # Criptografia em Repouso de Dados Sensíveis (Tokens OAuth Google via Fernet)
    SECURITY_ENCRYPTION_KEY: str = os.getenv("SECURITY_ENCRYPTION_KEY", "")

    @property
    def cors_origins_list(self) -> list:
        if not self.CORS_ORIGINS:
            return ["*"]
        # Se for explicitamente '*', retorna ['*']
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
