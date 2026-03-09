from __future__ import annotations

import base64
import os
from typing import Final

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
except ImportError:
    Fernet = None

ENCRYPTION_KEY: Final[str] = os.getenv("PLATFORM_ENCRYPTION_KEY", "default-insecure-key-do-not-use-in-prod")

def _get_fernet() -> Fernet | None:
    if Fernet is None:
        return None
    
    # Derive a key from the environment variable
    salt = b'karag-salt-fixed'
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(ENCRYPTION_KEY.encode()))
    return Fernet(key)

def encrypt_secret(text: str | None) -> str | None:
    if text is None:
        return None
    fernet = _get_fernet()
    if fernet is None:
        return text # Fallback to plaintext if cryptography is not installed
    return fernet.encrypt(text.encode()).decode()

def decrypt_secret(encrypted_text: str | None) -> str | None:
    if encrypted_text is None:
        return None
    fernet = _get_fernet()
    if fernet is None:
        return encrypted_text
    try:
        return fernet.decrypt(encrypted_text.encode()).decode()
    except Exception:
        return encrypted_text # Return as is if decryption fails (might be unencrypted)
