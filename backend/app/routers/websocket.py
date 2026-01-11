"""
WebSocket router for real-time updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from app.database import Attendance, User

router = APIRouter()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast_attendance(self, attendance_data: dict):
        """Broadcast new attendance record to all connected clients"""
        message = json.dumps({
            "type": "attendance",
            "data": attendance_data
        })
        
        # Send to all connected clients
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_camera_frame(self, frame_data: str):
        """Broadcast camera frame to all connected clients"""
        message = json.dumps({
            "type": "camera_frame",
            "data": frame_data
        })
        
        # Send to all connected clients
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error sending frame to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time attendance updates
    """
    await manager.connect(websocket)
    
    try:
        # Send initial subscription confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Subscribed to attendance updates"
        })
        
        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_text()
            
            # Handle client messages (e.g., ping/pong)
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except:
                pass
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Function to broadcast new attendance (called from attendance router)
async def broadcast_new_attendance(attendance_id: int, db: Session):
    """Broadcast a new attendance record"""
    from sqlalchemy.orm import Session as SessionType
    from app.utils import GMT7
    
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if attendance:
        user_name = None
        if attendance.user_id:
            user = db.query(User).filter(User.id == attendance.user_id).first()
            if user:
                user_name = user.name
        
        # Ensure timestamp is timezone-aware and serialize properly
        timestamp = attendance.timestamp
        if timestamp:
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=GMT7)
            timestamp_str = timestamp.isoformat()
        else:
            timestamp_str = None
        
        attendance_data = {
            "id": attendance.id,
            "user_id": attendance.user_id,
            "user_name": user_name,
            "timestamp": timestamp_str,
            "status": attendance.status,
            "device_id": attendance.device_id
        }
        
        await manager.broadcast_attendance(attendance_data)
