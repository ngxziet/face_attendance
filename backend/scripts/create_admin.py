"""
Script to create admin user
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, Admin, init_db
from app.services.auth_service import get_password_hash


def create_admin(username: str, password: str):
    """Create an admin user"""
    init_db()
    
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing = db.query(Admin).filter(Admin.username == username).first()
        if existing:
            print(f"Admin '{username}' already exists")
            return
        
        # Create new admin
        admin = Admin(
            username=username,
            password_hash=get_password_hash(password)
        )
        
        db.add(admin)
        db.commit()
        
        print(f"✓ Admin '{username}' created successfully")
        
    except Exception as e:
        print(f"✗ Error creating admin: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Create admin user")
    parser.add_argument("username", help="Admin username")
    parser.add_argument("password", help="Admin password")
    
    args = parser.parse_args()
    create_admin(args.username, args.password)
