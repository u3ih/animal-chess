import pytest

from app.services import chat_service, friend_service
from app.services.chat_service import ChatError
from tests.conftest import make_google_user


async def _make_friends(session):
    a = await make_google_user(session, "a@x.com", "alice")
    b = await make_google_user(session, "b@x.com", "bob")
    request = await friend_service.send_request(session, a.id, to_user_id=b.id, to_username=None)
    await friend_service.respond_request(session, b.id, request.id, True)
    return a, b


async def test_send_and_list_thread(session):
    a, b = await _make_friends(session)

    await chat_service.send_message(session, a.id, b.id, "hello")
    await chat_service.send_message(session, b.id, a.id, "hi back")

    thread = await chat_service.list_messages(session, a.id, b.id)
    assert [m.body for m in thread] == ["hello", "hi back"]
    # Same thread from either side.
    assert [m.body for m in await chat_service.list_messages(session, b.id, a.id)] == ["hello", "hi back"]


async def test_dm_requires_friendship(session):
    a = await make_google_user(session, "a@x.com", "alice")
    b = await make_google_user(session, "b@x.com", "bob")

    with pytest.raises(ChatError):
        await chat_service.send_message(session, a.id, b.id, "hello stranger")
    with pytest.raises(ChatError):
        await chat_service.send_message(session, a.id, a.id, "talking to myself")


async def test_dm_validation(session):
    a, b = await _make_friends(session)

    with pytest.raises(ChatError):
        await chat_service.send_message(session, a.id, b.id, "   ")
    with pytest.raises(ChatError):
        await chat_service.send_message(session, a.id, b.id, "x" * 501)


async def test_unread_and_mark_read(session):
    a, b = await _make_friends(session)

    await chat_service.send_message(session, a.id, b.id, "one")
    await chat_service.send_message(session, a.id, b.id, "two")

    assert await chat_service.unread_counts(session, b.id) == {a.id: 2}
    assert await chat_service.unread_counts(session, a.id) == {}

    assert await chat_service.mark_read(session, b.id, a.id) == 2
    assert await chat_service.unread_counts(session, b.id) == {}
    # Idempotent.
    assert await chat_service.mark_read(session, b.id, a.id) == 0


async def test_pagination_window(session):
    a, b = await _make_friends(session)
    for i in range(5):
        await chat_service.send_message(session, a.id, b.id, f"m{i}")

    latest = await chat_service.list_messages(session, a.id, b.id, limit=2)
    assert [m.body for m in latest] == ["m3", "m4"]

    older = await chat_service.list_messages(session, a.id, b.id, limit=2, before_id=latest[0].id)
    assert [m.body for m in older] == ["m1", "m2"]
