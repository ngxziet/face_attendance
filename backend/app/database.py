"""
Database setup and session management
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import json
import numpy as np

from app.config import DATABASE_URL
from app.utils import now_gmt7

# Create database engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class User(Base):
    """User model - stores user information and face encodings"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)  # MSSV/ID
    encoding = Column(Text, nullable=True)  # JSON string of 128-dim array
    image_path = Column(String, nullable=True)  # Path to user's enrollment image
    created_at = Column(DateTime, default=lambda: now_gmt7().replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: now_gmt7().replace(tzinfo=None), onupdate=lambda: now_gmt7().replace(tzinfo=None))
    
    # Relationships
    attendances = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
    
    def set_encoding(self, encoding_array):
        """Convert numpy array to JSON string"""
        if encoding_array is not None:
            self.encoding = json.dumps(encoding_array.tolist())
        else:
            self.encoding = None
    
    def get_encoding(self):
        """Convert JSON string back to numpy array"""
        if self.encoding:
            return np.array(json.loads(self.encoding))
        return None


class Attendance(Base):
    """Attendance record model"""
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for unknown faces
    timestamp = Column(DateTime, default=lambda: now_gmt7().replace(tzinfo=None), index=True)
    status = Column(String, nullable=False)  # 'success', 'failed', 'unknown'
    device_id = Column(String, nullable=True)  # Identify which client scanned
    
    # Relationships
    user = relationship("User", back_populates="attendances")


class Settings(Base):
    """System settings model"""
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    threshold = Column(Float, default=0.4)  # Face recognition threshold (lower = more strict/accurate)
    camera_id = Column(Integer, default=0)  # Default camera device ID


class Admin(Base):
    """Admin user model for authentication"""
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: now_gmt7().replace(tzinfo=None))


def init_db():
    """Initialize database - create all tables and migrate schema if needed"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Migrate: Add image_path column to users table if it doesn't exist
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    
    # Check if users table exists
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        # Add image_path column if it doesn't exist
        if 'image_path' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN image_path VARCHAR"))
                conn.commit()
                print("Added image_path column to users table")


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
