"""
Password hashing utilities (bcrypt via passlib).
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt silently ignores bytes beyond 72 — truncate explicitly so behavior
# is predictable and consistent between hashing and verification.
_MAX_BCRYPT_BYTES = 72


def _clamp(password: str) -> str:
    return password.encode("utf-8")[:_MAX_BCRYPT_BYTES].decode("utf-8", errors="ignore")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(_clamp(plain_password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_clamp(plain_password), hashed_password)
