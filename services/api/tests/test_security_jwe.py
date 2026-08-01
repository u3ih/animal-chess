"""Round-trip the NextAuth v4 JWE pipeline (dir + A256GCM + HKDF) we decode in prod."""

import json
import time

import pytest
from joserfc import jwe
from joserfc.jwk import OctKey

from app.core.security import AuthError, _derive_key, decode_session

SECRET = "test-secret-value"


def _encode(claims: dict) -> str:
    key = OctKey.import_key(_derive_key(SECRET))
    return jwe.encrypt_compact({"alg": "dir", "enc": "A256GCM"}, json.dumps(claims).encode(), key)


def test_round_trip():
    token = _encode({"email": "a@x.com", "name": "Alice", "sub": "123", "exp": time.time() + 3600})
    claims = decode_session(token, secret=SECRET)
    assert claims["email"] == "a@x.com"
    assert claims["name"] == "Alice"


def test_expired_rejected():
    token = _encode({"email": "a@x.com", "exp": time.time() - 10})
    with pytest.raises(AuthError):
        decode_session(token, secret=SECRET)


def test_wrong_secret_rejected():
    token = _encode({"email": "a@x.com", "exp": time.time() + 3600})
    with pytest.raises(AuthError):
        decode_session(token, secret="a-different-secret")


def test_garbage_rejected():
    with pytest.raises(AuthError):
        decode_session("not-a-jwe", secret=SECRET)
