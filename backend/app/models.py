"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime


# User Models
class UserBase(BaseModel):
    name: str
    code: str
    
    @validator('name')
    def validate_name(cls, v):
        if ',' in v:
            raise ValueError('Tên người dùng không được chứa dấu phẩy (,)')
        return v


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None and ',' in v:
            raise ValueError('Tên người dùng không được chứa dấu phẩy (,)')
        return v


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    has_encoding: bool  # Whether face encoding exists
    image_path: Optional[str] = None  # Path to user's enrollment image
    
    class Config:
        from_attributes = True


# Attendance Models
class AttendanceCreate(BaseModel):
    user_id: Optional[int] = None
    status: str  # 'success', 'failed', 'unknown'
    device_id: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    user_id: Optional[int]
    timestamp: datetime
    status: str
    device_id: Optional[str]
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# Authentication Models
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Settings Models
class SettingsResponse(BaseModel):
    id: int
    threshold: float
    camera_id: int
    
    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    threshold: Optional[float] = None
    camera_id: Optional[int] = None


# Statistics Models
class AttendanceStats(BaseModel):
    total_today: int
    total_this_week: int
    total_this_month: int
    total_users: int
    checked_in_today: int  # Number of unique users who checked in today (status='success')
    checked_in_users: List[str]  # List of user names who checked in today
    not_checked_in_users: List[str]  # List of user names who have not checked in today
    recent_scans: List[AttendanceResponse]
