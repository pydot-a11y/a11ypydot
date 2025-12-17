# tests/test_user_metadata.py
import pytest

from app.app import app  # your Flask app instance


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestUserMetadataEndpoint:
    def test_requires_ids_query_param(self, client):
        resp = client.get("/user-metadata/QA")
        assert resp.status_code == 400
        assert resp.get_json() == {"message": "ids query parameter is required"}

    def test_happy_path_returns_metadata_map(self, client, monkeypatch):
        # This patches the unqualified function call inside app.py:
        # rows = get_user_department(env.value, user_ids)
        def fake_get_user_department(env, user_ids):
            assert env == "QA"
            assert user_ids == ["dorothy", "browjose"]
            return [
                {"user.user": "dorothy", "user.division": "ENTERPRISE TECH & SERVICES"},
                {"user.user": "browjose", "user.division": "ENTERPRISE TECH & SERVICES"},
            ]

        monkeypatch.setattr("app.app.get_user_department", fake_get_user_department)

        resp = client.get("/user-metadata/QA?ids=dorothy;browjose")
        assert resp.status_code == 200

        body = resp.get_json()
        assert "metadata" in body
        assert body["metadata"]["dorothy"]["department"] == "ENTERPRISE TECH & SERVICES"
        assert body["metadata"]["browjose"]["department"] == "ENTERPRISE TECH & SERVICES"

    def test_ignores_empty_ids_and_whitespace(self, client, monkeypatch):
        def fake_get_user_department(env, user_ids):
            # your route filters out empty strings; if you don't strip whitespace yet,
            # you can adjust the expectation here.
            assert env == "QA"
            assert user_ids == ["dorothy", "browjose"]
            return [
                {"user.user": "dorothy", "user.division": "DIV"},
                {"user.user": "browjose", "user.division": "DIV"},
            ]

        monkeypatch.setattr("app.app.get_user_department", fake_get_user_department)

        resp = client.get("/user-metadata/QA?ids=dorothy;;browjose;")
        assert resp.status_code == 200
        assert set(resp.get_json()["metadata"].keys()) == {"dorothy", "browjose"}

    def test_value_error_maps_to_400(self, client, monkeypatch):
        def fake_get_user_department(env, user_ids):
            raise ValueError("Unknown environment [QA]")

        monkeypatch.setattr("app.app.get_user_department", fake_get_user_department)

        resp = client.get("/user-metadata/QA?ids=dorothy")
        assert resp.status_code == 400
        assert resp.get_json() == {"message": "Unknown environment [QA]"}

    def test_unexpected_error_maps_to_500(self, client, monkeypatch):
        def fake_get_user_department(env, user_ids):
            raise RuntimeError("TAI request failed: 400 Bad Request")

        monkeypatch.setattr("app.app.get_user_department", fake_get_user_department)

        resp = client.get("/user-metadata/QA?ids=dorothy")
        assert resp.status_code == 500

        msg = resp.get_json()["message"]
        # don’t over-specify; keep it resilient to wording tweaks
        assert "Failed to retrieve user metadata" in msg

        pytest -q tests/test_user_metadata.py
# or run all
pytest -q