# backend/security.py
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt

# Config - use env vars in production
JWT_SECRET = os.environ.get("JWT_SECRET", "supersecret-demo-key-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRES_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRES_MINUTES", "5"))
REFRESH_TOKEN_BYTES = int(os.environ.get("REFRESH_TOKEN_BYTES", "32"))  # raw bytes for refresh token

# Password hashing config
PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 100000  # Use PBKDF2 iterations for security

# ---------- Password hashing & verification (PBKDF2-based, no bcrypt issues) ----------
def hash_password(password: str) -> str:
    """
    Hash a user password using PBKDF2-SHA256.
    Format: algorithm$iterations$salt$hash
    """
    import secrets
    salt = secrets.token_hex(16)  # 16 random bytes = 32 hex chars
    iterations = PASSWORD_HASH_ITERATIONS
    
    # Derive key using PBKDF2
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations
    )
    hash_hex = hashed.hex()
    
    # Format: algorithm$iterations$salt$hash
    return f"{PASSWORD_HASH_ALGORITHM}${iterations}${salt}${hash_hex}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a PBKDF2 hash.
    Parse format: algorithm$iterations$salt$hash
    """
    try:
        parts = hashed_password.split('$')
        if len(parts) != 4 or parts[0] != PASSWORD_HASH_ALGORITHM:
            return False
        
        algorithm, iterations, salt, stored_hash = parts
        iterations = int(iterations)
        
        # Re-derive the hash with the same parameters
        hashed = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        
        # Constant-time comparison to prevent timing attacks
        import hmac
        return hmac.compare_digest(hashed.hex(), stored_hash)
    except (ValueError, IndexError):
        return False

# ---------- Access token (JWT) ----------
def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with 'sub' set to subject (e.g. user id).
    Default expiry uses ACCESS_TOKEN_EXPIRES_MINUTES.
    """
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRES_MINUTES))
    to_encode = {"sub": str(subject), "exp": expire}
    token = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT. Raises jose.JWTError on failure.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

# ---------- Refresh tokens (not JWT) ----------
def create_refresh_token() -> str:
    """
    Create a cryptographically-random refresh token (hex string).
    This is not a JWT. It's stored hashed server-side.
    """
    return os.urandom(REFRESH_TOKEN_BYTES).hex()

def hash_refresh_token(token: str) -> str:
    """
    Hash refresh tokens using SHA-256 (bcrypt is unnecessary / wrong for long tokens).
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def verify_refresh_token(token: str, token_hash: str) -> bool:
    """
    Verify a refresh token by hashing and comparing.
    """
    return hash_refresh_token(token) == token_hash

# ---------- Convenience for tests / quick usage ----------
if __name__ == "__main__":
    # quick self-test
    pw = "s" * 100  # long password to test truncation
    hp = hash_password(pw)
    print("hashed len:", len(hp))
    print("verify (original):", verify_password(pw, hp))
    print("verify (short):", verify_password("s" * 72, hp))
    at = create_access_token("user123")
    print("access token:", at)
    print("decoded:", decode_access_token(at))
    rt = create_refresh_token()
    print("refresh token:", rt)
    print("refresh hash:", hash_refresh_token(rt))
