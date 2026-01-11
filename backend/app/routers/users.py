"""
Users router - CRUD operations for users
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.utils import now_gmt7
import json
import numpy as np

from app.database import get_db, User
from app.models import UserCreate, UserUpdate, UserResponse
from app.services.face_service import extract_encoding_from_bytes
from app.dependencies import get_current_user
from app.config import USER_IMAGES_DIR
from pathlib import Path

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserResponse])
def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get list of all users"""
    users = db.query(User).offset(skip).limit(limit).all()
    return [
        UserResponse(
            id=user.id,
            name=user.name,
            code=user.code,
            created_at=user.created_at,
            updated_at=user.updated_at,
            has_encoding=user.encoding is not None,
            image_path=f"/api/users/{user.id}/image" if user.image_path else None
        )
        for user in users
    ]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get a specific user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        name=user.name,
        code=user.code,
        created_at=user.created_at,
        updated_at=user.updated_at,
        has_encoding=user.encoding is not None,
        image_path=f"/api/users/{user.id}/image" if user.image_path else None
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate, 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a new user"""
    # Check if code already exists
    existing = db.query(User).filter(User.code == user.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this code already exists")
    
    # Create new user
    db_user = User(name=user.name, code=user.code)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return UserResponse(
        id=db_user.id,
        name=db_user.name,
        code=db_user.code,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at,
        has_encoding=False
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, 
    user_update: UserUpdate, 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Update user information"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    if user_update.name is not None:
        # Validate: không cho phép dấu phẩy trong tên
        if ',' in user_update.name:
            raise HTTPException(status_code=400, detail="Tên người dùng không được chứa dấu phẩy (,)")
        db_user.name = user_update.name
    if user_update.code is not None:
        # Check if new code already exists
        existing = db.query(User).filter(User.code == user_update.code, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="User with this code already exists")
        db_user.code = user_update.code
    
    db_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)
    
    return UserResponse(
        id=db_user.id,
        name=db_user.name,
        code=db_user.code,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at,
        has_encoding=db_user.encoding is not None,
        image_path=f"/api/users/{db_user.id}/image" if db_user.image_path else None
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Delete a user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return None


@router.get("/{user_id}/image")
def get_user_image(user_id: int, db: Session = Depends(get_db)):
    """Get user enrollment image (public endpoint)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.image_path:
        raise HTTPException(status_code=404, detail="User image not found")
    
    # Get image file path
    image_path = USER_IMAGES_DIR / user.image_path
    
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="User image file not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        image_path,
        media_type="image/jpeg",
        filename=f"user_{user_id}.jpg"
    )


@router.post("/{user_id}/enroll", response_model=UserResponse)
def enroll_face(
    user_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Enroll user's face - upload image and extract encoding"""
    try:
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check file
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read image bytes
        image_bytes = file.file.read()
        
        if not image_bytes or len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        print(f"Received file: {file.filename}, size: {len(image_bytes)} bytes, content_type: {file.content_type}")
        
        # Extract face encoding
        encoding = extract_encoding_from_bytes(image_bytes)
        
        if encoding is None:
            raise HTTPException(
                status_code=400, 
                detail="Không phát hiện được khuôn mặt trong ảnh. Vui lòng đảm bảo:\n"
                       "- Khuôn mặt rõ ràng và nhìn thẳng vào camera\n"
                       "- Ánh sáng đủ và không bị ngược sáng\n"
                       "- Không đeo kính râm hoặc che khuất khuôn mặt\n"
                       "- Ảnh có độ phân giải đủ (tối thiểu 200x200 pixels)"
            )
        
        # Save image to file system
        image_filename = f"user_{user_id}_{int(now_gmt7().timestamp())}.jpg"
        image_path = USER_IMAGES_DIR / image_filename
        
        # Delete old image if exists
        if db_user.image_path:
            # Extract filename from old path
            old_filename = Path(db_user.image_path).name
            old_image_path = USER_IMAGES_DIR / old_filename
            if old_image_path.exists():
                old_image_path.unlink()
        
        # Save new image
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        
        # Store encoding and image path (relative path for API endpoint)
        db_user.set_encoding(encoding)
        db_user.image_path = image_filename  # Store filename only
        db_user.updated_at = now_gmt7()
        db.commit()
        db.refresh(db_user)
        
        return UserResponse(
            id=db_user.id,
            name=db_user.name,
            code=db_user.code,
            created_at=db_user.created_at,
            updated_at=db_user.updated_at,
            has_encoding=True,
            image_path=f"/api/users/{db_user.id}/image" if db_user.image_path else None
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in enroll_face: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
