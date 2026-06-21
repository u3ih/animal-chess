from app.services import friend_service
from tests.conftest import make_google_user


async def test_request_then_accept(session):
    a = await make_google_user(session, "a@x.com", "alice")
    b = await make_google_user(session, "b@x.com", "bob")

    request = await friend_service.send_request(session, a.id, to_user_id=b.id, to_username=None)
    assert request.status == "pending"

    accepted = await friend_service.respond_request(session, b.id, request.id, True)
    assert accepted.status == "accepted"

    friends = await friend_service.list_friends(session, a.id)
    assert any(u.id == b.id for u in friends)
    assert await friend_service.are_friends(session, a.id, b.id)


async def test_reciprocal_request_auto_accepts(session):
    a = await make_google_user(session, "a@x.com", "alice")
    b = await make_google_user(session, "b@x.com", "bob")

    await friend_service.send_request(session, a.id, to_user_id=b.id, to_username=None)
    reverse = await friend_service.send_request(session, b.id, to_user_id=a.id, to_username=None)
    assert reverse.status == "accepted"
    assert await friend_service.are_friends(session, a.id, b.id)


async def test_remove_friend(session):
    a = await make_google_user(session, "a@x.com", "alice")
    b = await make_google_user(session, "b@x.com", "bob")
    request = await friend_service.send_request(session, a.id, to_user_id=b.id, to_username=None)
    await friend_service.respond_request(session, b.id, request.id, True)

    assert await friend_service.remove_friend(session, a.id, b.id)
    assert not await friend_service.are_friends(session, a.id, b.id)
