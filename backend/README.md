# Face Attendance System - Backend

FastAPI backend for the Face Attendance System.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\Activate.ps1  # Windows
# or
source venv/bin/activate  # Linux/Mac
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database

The SQLite database (`attendance.db`) will be created automatically on first run.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `POST /api/users/{id}/enroll` - Enroll face (upload image)

### Attendance
- `POST /api/attendance/scan` - Record face scan
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/stats` - Get statistics

### Settings
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update settings

### WebSocket
- `WS /ws` - Real-time attendance updates

## Environment Variables

- `SECRET_KEY` - JWT secret key (default: "your-secret-key-change-in-production")
