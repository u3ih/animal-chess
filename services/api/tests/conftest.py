"""Test fixtures: in-memory SQLite session + a fake Redis (no Postgres/Redis needed)."""

import fakeredis.aioredis
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

import app.events as events
import app.models  # noqa: F401 — register tables
from app.enums import UserKind
from app.models.user import User
from app.services.user_service import ensure_progress_rows


@pytest_asyncio.fixture
async def session() -> AsyncSession:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    events._redis = fakeredis.aioredis.FakeRedis(decode_responses=True)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as s:
        yield s

    await events.close_redis()
    await engine.dispose()


async def make_google_user(session: AsyncSession, email: str, username: str) -> User:
    user = User(kind=UserKind.GOOGLE.value, email=email, external_id=email, username=username)
    session.add(user)
    await session.flush()
    await ensure_progress_rows(session, user.id)
    await session.commit()
    await session.refresh(user)
    return user
