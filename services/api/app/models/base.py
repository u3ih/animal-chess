"""Shared column helpers for SQLModel tables."""

from datetime import datetime

from sqlalchemy import Column, DateTime, func


def created_column() -> Column:
    return Column(DateTime(timezone=True), nullable=False, server_default=func.now())


def updated_column() -> Column:
    return Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


def utc_column(nullable: bool = True) -> Column:
    return Column(DateTime(timezone=True), nullable=nullable)


__all__ = ["created_column", "updated_column", "utc_column", "datetime"]
