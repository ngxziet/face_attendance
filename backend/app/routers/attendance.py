"""
Attendance router - Handle attendance records
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta
from app.utils import now_gmt7, utc_to_gmt7, GMT7

from app.database import get_db, Attendance, User
from app.models import AttendanceCreate, AttendanceResponse, AttendanceStats
from app.routers.websocket import broadcast_new_attendance

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("/encodings")
def get_user_encodings(db: Session = Depends(get_db)):
    """
    Public endpoint to get user encodings for face recognition
    Returns user_id, name, and encoding (for desktop clients)
    """
    users = db.query(User).filter(User.encoding.isnot(None)).all()
    
    result = []
    for user in users:
        encoding = user.get_encoding()
        if encoding is not None:
            # Construct image URL if image exists
            image_url = None
            if user.image_path:
                image_url = f"/api/users/{user.id}/image"
            
            result.append({
                "user_id": user.id,
                "name": user.name,
                "encoding": encoding.tolist(),  # Convert numpy array to list
                "image_path": image_url  # API endpoint for user image
            })
    
    return {"encodings": result}


@router.post("/scan", response_model=AttendanceResponse, status_code=201)
async def record_scan(scan_data: AttendanceCreate, db: Session = Depends(get_db)):
    """
    Record a face scan result from desktop client
    """
    # Create attendance record (store in GMT+7)
    attendance = Attendance(
        user_id=scan_data.user_id,
        timestamp=now_gmt7(),
        status=scan_data.status,
        device_id=scan_data.device_id
    )
    
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    # Broadcast to WebSocket clients
    await broadcast_new_attendance(attendance.id, db)
    
    # Get user name if user_id exists
    user_name = None
    if attendance.user_id:
        user = db.query(User).filter(User.id == attendance.user_id).first()
        if user:
            user_name = user.name
    
    # Ensure timestamp is timezone-aware (GMT+7)
    timestamp = attendance.timestamp
    if timestamp and timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=GMT7)
    
    return AttendanceResponse(
        id=attendance.id,
        user_id=attendance.user_id,
        timestamp=timestamp,
        status=attendance.status,
        device_id=attendance.device_id,
        user_name=user_name
    )


@router.get("", response_model=List[AttendanceResponse])
def get_attendance(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=50000),  # Increased limit for reports export
    user_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get attendance records with optional filters
    """
    query = db.query(Attendance)
    
    # Apply filters
    if user_id:
        query = query.filter(Attendance.user_id == user_id)
    
    if status:
        query = query.filter(Attendance.status == status)
    
    if start_date:
        try:
            # Handle date format YYYY-MM-DD (assume GMT+7 timezone)
            if len(start_date) == 10:  # YYYY-MM-DD format
                from app.utils import GMT7
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').replace(tzinfo=GMT7)
            else:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Attendance.timestamp >= start_dt)
        except (ValueError, AttributeError) as e:
            print(f"Error parsing start_date: {e}")
            pass
    
    if end_date:
        try:
            # Handle date format YYYY-MM-DD (assume GMT+7 timezone)
            if len(end_date) == 10:  # YYYY-MM-DD format
                from app.utils import GMT7
                # Add time 23:59:59 to include the whole day in GMT+7
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=GMT7)
            else:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Attendance.timestamp <= end_dt)
        except (ValueError, AttributeError) as e:
            print(f"Error parsing end_date: {e}")
            pass
    
    # Order by timestamp descending
    attendances = query.order_by(desc(Attendance.timestamp)).offset(skip).limit(limit).all()
    
    # Build response with user names
    result = []
    for att in attendances:
        user_name = None
        if att.user_id:
            user = db.query(User).filter(User.id == att.user_id).first()
            if user:
                user_name = user.name
        
        # Ensure timestamp is timezone-aware (GMT+7)
        timestamp = att.timestamp
        if timestamp and timestamp.tzinfo is None:
            # Assume stored datetime is GMT+7 (naive), make it timezone-aware
            timestamp = timestamp.replace(tzinfo=GMT7)
        
        result.append(AttendanceResponse(
            id=att.id,
            user_id=att.user_id,
            timestamp=timestamp,
            status=att.status,
            device_id=att.device_id,
            user_name=user_name
        ))
    
    return result


@router.get("/stats", response_model=AttendanceStats)
def get_stats(
    db: Session = Depends(get_db)
):
    """
    Get attendance statistics
    """
    now = now_gmt7()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    # Convert to naive datetime for database comparison (timestamp is stored as naive)
    today_start_naive = today_start.replace(tzinfo=None)
    week_start_naive = (today_start - timedelta(days=now.weekday())).replace(tzinfo=None)
    month_start_naive = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    
    # Count today (all records)
    total_today = db.query(Attendance).filter(Attendance.timestamp >= today_start_naive).count()
    
    # Count this week
    total_this_week = db.query(Attendance).filter(Attendance.timestamp >= week_start_naive).count()
    
    # Count this month
    total_this_month = db.query(Attendance).filter(Attendance.timestamp >= month_start_naive).count()
    
    # Get total number of users
    total_users = db.query(User).count()
    
    # Count unique users who checked in today (status='success' and user_id is not None)
    # Get all attendance records for today with success status
    # Also filter by today's date (not just >= today_start) to ensure we only count today
    today_end_naive = today_start_naive.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    today_attendances = db.query(Attendance).filter(
        Attendance.timestamp >= today_start_naive,
        Attendance.timestamp <= today_end_naive,
        Attendance.status == 'success',
        Attendance.user_id.isnot(None)
    ).all()
    
    # Get unique user_ids and user names from today's successful attendances
    unique_user_ids = set()
    checked_in_user_names = []
    user_id_to_name = {}
    
    for att in today_attendances:
        if att.user_id is not None:
            unique_user_ids.add(att.user_id)
            # Get user name if not already cached
            if att.user_id not in user_id_to_name:
                user = db.query(User).filter(User.id == att.user_id).first()
                if user:
                    user_id_to_name[att.user_id] = user.name
    
    # Build list of checked-in user names
    for user_id in unique_user_ids:
        if user_id in user_id_to_name:
            checked_in_user_names.append(user_id_to_name[user_id])
    
    checked_in_today = len(unique_user_ids)
    
    # Get list of users who have NOT checked in today
    all_users = db.query(User).all()
    checked_in_user_ids_set = unique_user_ids
    not_checked_in_user_names = []
    
    for user in all_users:
        if user.id not in checked_in_user_ids_set:
            not_checked_in_user_names.append(user.name)
    
    # Sort alphabetically
    not_checked_in_user_names.sort()
    
    # Get recent scans (last 10)
    recent_attendances = db.query(Attendance).order_by(desc(Attendance.timestamp)).limit(10).all()
    
    recent_scans = []
    for att in recent_attendances:
        user_name = None
        if att.user_id:
            user = db.query(User).filter(User.id == att.user_id).first()
            if user:
                user_name = user.name
        
        # Ensure timestamp is timezone-aware (GMT+7)
        timestamp = att.timestamp
        if timestamp and timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=GMT7)
        
        recent_scans.append(AttendanceResponse(
            id=att.id,
            user_id=att.user_id,
            timestamp=timestamp,
            status=att.status,
            device_id=att.device_id,
            user_name=user_name
        ))
    
    return AttendanceStats(
        total_today=total_today,
        total_this_week=total_this_week,
        total_this_month=total_this_month,
        total_users=total_users,
        checked_in_today=checked_in_today,
        checked_in_users=checked_in_user_names,
        not_checked_in_users=not_checked_in_user_names,
        recent_scans=recent_scans
    )
