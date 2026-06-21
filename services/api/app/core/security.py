"""Trust boundaries.

Two independent secrets:

* ``NEXTAUTH_SECRET`` — shared with the web app. Used to **decode the NextAuth v4
  session JWT**, which is an *encrypted* JWE (``dir`` + ``A256GCM``, key derived from
  the secret via HKDF-SHA256), not a signed JWS. This replicates what NextAuth's
  ``getToken()`` does on the server. If the repo ever moves to NextAuth v5 / Auth.js
  the derivation changes (salt = cookie name, info gains the salt, 64-byte key) —
  see ``_V4_*`` below, the single spot to change.
* ``INTERNAL_SYNC_SECRET`` — shared with the Node game server. HMACs the body of the
  internal Node→Python GraphQL mutations.
"""

import hmac
import json
import time
from hashlib import sha256

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from joserfc import jwe
from joserfc.jwk import OctKey

from app.config import get_settings

# --- NextAuth v4 JWE derivation parameters (do not change without a version bump) ---
_V4_INFO = b"NextAuth.js Generated Encryption Key"
_V4_SALT = b""
_V4_KEY_LEN = 32  # A256GCM ⇒ 32-byte content-encryption key
_INTERNAL_MAX_SKEW_SECONDS = 300


class AuthError(Exception):
    """Raised when a session token cannot be decoded or has expired."""


def _derive_key(secret: str) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(),
        length=_V4_KEY_LEN,
        salt=_V4_SALT,
        info=_V4_INFO,
    ).derive(secret.encode("utf-8"))


def decode_session(token: str, *, secret: str | None = None) -> dict:
    """Decrypt + validate a NextAuth v4 session JWE. Raises ``AuthError`` on tamper/expiry.

    Returns the claims dict, typically ``{name, email, picture, sub, iat, exp, jti}``.
    """
    key = OctKey.import_key(_derive_key(secret or get_settings().nextauth_secret))
    try:
        obj = jwe.decrypt_compact(token, key, algorithms=["dir", "A256GCM"])
    except Exception as exc:  # noqa: BLE001 — any crypto failure is an auth failure
        raise AuthError("invalid session token") from exc

    plaintext = obj.plaintext
    if plaintext is None:
        raise AuthError("empty session token")
    try:
        claims = json.loads(plaintext)
    except json.JSONDecodeError as exc:
        raise AuthError("malformed session token") from exc

    exp = claims.get("exp")
    if exp is not None and float(exp) < time.time():
        raise AuthError("session expired")
    return claims


def internal_signature(raw_body: bytes, timestamp: str, *, secret: str | None = None) -> str:
    """The expected ``X-Internal-Signature`` for a request body + timestamp."""
    key = (secret or get_settings().internal_sync_secret).encode("utf-8")
    message = timestamp.encode("utf-8") + b"." + raw_body
    return hmac.new(key, message, sha256).hexdigest()


def verify_internal_request(raw_body: bytes, signature: str | None, timestamp: str | None) -> bool:
    """Constant-time verify an internal Node→Python call; rejects stale timestamps (replay)."""
    if not signature or not timestamp:
        return False
    try:
        skew = abs(time.time() - float(timestamp))
    except (TypeError, ValueError):
        return False
    if skew > _INTERNAL_MAX_SKEW_SECONDS:
        return False
    return hmac.compare_digest(internal_signature(raw_body, timestamp), signature)
