"""Input validation shared by services (mirrors the web app's Valibot rules)."""

import re

# Ported from apps/web/src/app/api/profile/route.ts: 2–24 chars, unicode letters/digits
# plus space, underscore, dot, hyphen. \w under re.UNICODE covers letters/digits/underscore.
_USERNAME_RE = re.compile(r"^[\w .\-]+$", re.UNICODE)


class ValidationError(Exception):
    pass


def clean_username(raw: str) -> str:
    name = (raw or "").strip()
    if not (2 <= len(name) <= 24) or not _USERNAME_RE.match(name):
        raise ValidationError("invalid username")
    return name
