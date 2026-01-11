"""
Configuration settings for the application
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/attendance.db")

# User images directory
USER_IMAGES_DIR = BASE_DIR / "data" / "user_images"
USER_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# JWT Settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Face Recognition Settings
FACE_RECOGNITION_THRESHOLD = 0.4  # Default threshold for face matching (lower = more strict/accurate)

# CORS Settings
CORS_ORIGINS = [
    "http://localhost:3000",  # React dev server
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
