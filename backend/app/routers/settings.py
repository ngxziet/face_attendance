"""
Settings router - System configuration
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, Settings
from app.models import SettingsResponse, SettingsUpdate
from app.dependencies import get_current_user
from fastapi import Depends

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get system settings (requires authentication)"""
    settings = db.query(Settings).first()
    
    # Create default settings if none exist
    if not settings:
        settings = Settings(threshold=0.6, camera_id=0)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return SettingsResponse(
        id=settings.id,
        threshold=settings.threshold,
        camera_id=settings.camera_id
    )


@router.get("/public", response_model=SettingsResponse)
def get_settings_public(db: Session = Depends(get_db)):
    """
    Public endpoint to get system settings (for desktop clients)
    Returns only threshold setting needed for face recognition
    """
    settings = db.query(Settings).first()
    
    # Create default settings if none exist
    if not settings:
        settings = Settings(threshold=0.6, camera_id=0)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return SettingsResponse(
        id=settings.id,
        threshold=settings.threshold,
        camera_id=settings.camera_id
    )


@router.put("", response_model=SettingsResponse)
def update_settings(
    settings_update: SettingsUpdate, 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Update system settings"""
    settings = db.query(Settings).first()
    
    if not settings:
        settings = Settings()
        db.add(settings)
    
    if settings_update.threshold is not None:
        settings.threshold = settings_update.threshold
    
    if settings_update.camera_id is not None:
        settings.camera_id = settings_update.camera_id
    
    db.commit()
    db.refresh(settings)
    
    return SettingsResponse(
        id=settings.id,
        threshold=settings.threshold,
        camera_id=settings.camera_id
    )
