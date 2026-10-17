from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

class FormBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

class FormCreate(FormBase):
    questions: Optional[List[Dict[str, Any]]] = []
    welcome_screen: Optional[Dict[str, Any]] = None
    ending_screens: Optional[List[Dict[str, Any]]] = []
    theme: Optional[Dict[str, Any]] = None

class FormUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = None
    questions: Optional[List[Dict[str, Any]]] = None
    welcome_screen: Optional[Dict[str, Any]] = None
    ending_screens: Optional[List[Dict[str, Any]]] = None
    theme: Optional[Dict[str, Any]] = None
    webhook_url: Optional[str] = None
    google_calendar_connected: Optional[bool] = None
    google_calendar_email: Optional[str] = None

class FormResponse(FormBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    status: str
    responses_count: int
    completion_rate: float
    questions: List[Dict[str, Any]] = []
    welcome_screen: Optional[Dict[str, Any]] = None
    ending_screens: List[Dict[str, Any]] = []
    theme: Optional[Dict[str, Any]] = None
    webhook_url: Optional[str] = None
    google_calendar_connected: bool = False
    google_calendar_email: Optional[str] = None
    user_id: int
    created_at: datetime
    updated_at: datetime



