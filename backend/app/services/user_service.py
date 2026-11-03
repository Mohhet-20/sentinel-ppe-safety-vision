from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth.security import hash_password, verify_password
from app.models.user import User


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.execute(select(User).where(User.username == username)).scalar_one_or_none()


def get_user_by_identifier(db: Session, identifier: str) -> User | None:
    """Look up a user by username OR email — lets people sign in with either."""
    normalized = identifier.strip()
    return db.execute(
        select(User).where(or_(User.username == normalized, User.email == normalized.lower()))
    ).scalar_one_or_none()


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_identifier(db, username)
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(db: Session, *, username: str, email: str, password: str, role, full_name: str | None = None) -> User:
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        full_name=full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session) -> list[User]:
    return db.execute(select(User)).scalars().all()


def update_user(db: Session, user_id: str, **changes) -> User | None:
    user = db.get(User, user_id)
    if not user:
        return None
    for key, val in changes.items():
        setattr(user, key, val)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: str) -> bool:
    user = db.get(User, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True


def set_user_password(db: Session, user_id: str, new_password: str) -> User | None:
    user = db.get(User, user_id)
    if not user:
        return None
    user.hashed_password = hash_password(new_password)
    user.force_password_change = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def set_user_active(db: Session, user_id: str, active: bool) -> User | None:
    user = db.get(User, user_id)
    if not user:
        return None
    user.is_active = active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
