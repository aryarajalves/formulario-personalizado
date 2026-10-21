from fastapi import APIRouter
from app.api.v1.endpoints import users, backups, logs, forms, google_calendar_router

api_router = APIRouter()
api_router.include_router(users.router)
api_router.include_router(backups.router)
api_router.include_router(logs.router)
api_router.include_router(forms.router)
api_router.include_router(google_calendar_router.router)
