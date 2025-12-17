import json
import sys
from unittest.mock import MagicMock, patch

import pytest
from http import HTTPStatus
from flask import Flask

# Mock external deps before importing app (matches your existing pattern)
sys.modules["mongodb_python_driver"] = MagicMock()
sys.modules["ms"] = MagicMock()
sys.modules["ms.directory"] = MagicMock()

from app.app import app  # noqa: E402
from app.constants import AUTHENTICATED_WEBSTACK_USER_HEADER  # noqa: E402


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_user_metadata_route_exists():
    routes = [rule.rule for rule in app.url_map.iter_rules()]
    # Flask-RESTX typically registers the route exactly as defined
    assert "/user-metadata/<env>" in routes


def test_user_metadata_missing_ids_returns_400(client):
    # Include header to match existing tests (safe even if auth is disabled locally)
    resp = client.get(
        "/user-metadata/QA",
        headers={AUTHENTICATED_WEBSTACK_USER_HEADER: "test.user@example.com"},
    )

    assert resp.status_code == HTTPStatus.BAD_REQUEST
    data = json.loads(resp.data)
    assert data["message"] == "ids query parameter is required"


@patch("app.app.get_user_department")
def test_user_metadata_success_returns_metadata_map(mock_get_user_department, client):
    # This mocks what your TAI call returns (list of dict rows)
    mock_get_user_department.return_value = [
       {"user.user": "user_a", "user.division": "ENTERPRISE TECH & SERVICES"},
       {"user.user": "user_b", "user.division": "WEALTH MANAGEMENT"},
    ]

    resp = client.get(
        "/user-metadata/QA?ids=user_a,user_b",
        headers={AUTHENTICATED_WEBSTACK_USER_HEADER: "test.user@example.com"},
    )

    assert resp.status_code == HTTPStatus.OK
    payload = json.loads(resp.data)

    assert "metadata" in payload
    assert payload["metadata"]["user_a"]["department"] == "ENTERPRISE TECH & SERVICES"
    assert payload["metadata"]["user_b"]["department"] == "WEALTH MANAGEMENT"

    # Also verify we called the service with the env value + list of ids
    mock_get_user_department.assert_called_once()
    called_env, called_ids = mock_get_user_department.call_args[0]
    assert called_env == "QA"
    assert called_ids == ["user_b", "user_a"]


@patch("app.app.get_user_department")
def test_user_metadata_value_error_returns_400(mock_get_user_department, client):
    mock_get_user_department.side_effect = ValueError("Unknown environment [NOPE]")

    resp = client.get(
        "/user-metadata/NOPE?ids=user_b",
        headers={AUTHENTICATED_WEBSTACK_USER_HEADER: "test.user@example.com"},
    )

    assert resp.status_code == HTTPStatus.BAD_REQUEST
    data = json.loads(resp.data)
    assert data["message"] == "Unknown environment [NOPE]"


@patch("app.app.get_user_department")
def test_user_metadata_unexpected_error_returns_500(mock_get_user_department, client):
    mock_get_user_department.side_effect = Exception("TAI is down")

    resp = client.get(
        "/user-metadata/QA?ids=user_b",
        headers={AUTHENTICATED_WEBSTACK_USER_HEADER: "test.user@example.com"},
    )

    assert resp.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    data = json.loads(resp.data)
    assert data["message"] == "Failed to retrieve user metadata"