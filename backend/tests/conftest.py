import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.rate_limiter import reset_rate_limits

# Import all models so Base.metadata knows about all tables
from app.models.user import User, Invite, RegistrationVerification
from app.models.form import Form, FormResponseData, WebhookDeliveryLog
from app.models.backup import BackupSchedule, BackupHistory

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    # Seed superadmin
    db = TestingSessionLocal()
    superadmin = User(
        email=settings.SUPERADMIN_EMAIL,
        name=settings.SUPERADMIN_NAME,
        hashed_password=get_password_hash(settings.SUPERADMIN_PASSWORD),
        role="superadmin",
        is_active=True
    )
    db.add(superadmin)
    db.commit()
    db.close()
    reset_rate_limits()
    yield
    reset_rate_limits()
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

# Alias tests.conftest to this module to prevent duplicate module loading
sys.modules['tests.conftest'] = sys.modules[__name__]
