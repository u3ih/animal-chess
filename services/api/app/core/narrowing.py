"""Narrow Optionals that a nearby invariant already guarantees.

Two shapes recur across the services and are ``None`` only to the type checker:

* an autoincrement primary key (``id: int | None``) read back *after* the row was flushed;
* a progress row (rating/wallet/streak) read back *after* ``ensure_progress_rows`` created it.

``must`` states that invariant in code rather than papering over it with ``# type: ignore``, so a
genuine violation surfaces as a loud error at the point of the broken assumption instead of an
``AttributeError`` several frames away.
"""

from typing import TypeVar

T = TypeVar("T")


def must(value: T | None, what: str) -> T:
    """Return ``value``, raising if the invariant that it is set has been broken."""
    if value is None:
        raise RuntimeError(f"expected {what} to be set")
    return value
