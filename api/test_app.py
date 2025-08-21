import json
from unittest.mock import Mock, patch

import pytest
import responses
from authlib.jose import JsonWebKey, jwt

import app
from app import AuthError, get_jwks, requires_auth


class TestJWKSCache:
    """Test JWKS key retrieval and caching functionality."""

    @responses.activate
    def test_get_jwks_success(self):
        """Test successful JWKS retrieval."""
        mock_jwks = {
            "keys": [
                {
                    "kty": "RSA",
                    "kid": "test-key-id",
                    "use": "sig",
                    "n": "test-n",
                    "e": "AQAB",
                }
            ]
        }
        responses.add(responses.GET, app.JWKS_URL, json=mock_jwks, status=200)

        # Clear cache
        app._jwks = None

        jwks = get_jwks()
        assert jwks is not None
        # Verify caching works
        assert app._jwks is not None

    @responses.activate
    def test_get_jwks_http_error(self):
        """Test JWKS retrieval with HTTP error."""
        responses.add(responses.GET, app.JWKS_URL, status=500)

        # Clear cache
        app._jwks = None

        with pytest.raises(Exception):
            get_jwks()

    @responses.activate
    def test_get_jwks_uses_cache(self):
        """Test that JWKS uses cache on subsequent calls."""
        mock_jwks = {
            "keys": [
                {
                    "kty": "RSA",
                    "kid": "test-key-id",
                    "use": "sig",
                    "n": "test-n",
                    "e": "AQAB",
                }
            ]
        }
        responses.add(responses.GET, app.JWKS_URL, json=mock_jwks, status=200)

        # Clear cache
        app._jwks = None

        # First call should make HTTP request
        jwks1 = get_jwks()
        assert len(responses.calls) == 1

        # Second call should use cache
        jwks2 = get_jwks()
        assert len(responses.calls) == 1  # No additional HTTP call
        assert jwks1 is jwks2


class TestAuthError:
    """Test AuthError exception handling."""

    def test_auth_error_creation(self):
        """Test AuthError exception creation."""
        error = AuthError("Test error message")
        assert error.message == "Test error message"
        assert error.status_code == 401

    def test_auth_error_handler(self):
        """Test AuthError handler returns correct response."""
        with app.app.app_context():
            error = AuthError("Unauthorized access")
            response = app.handle_auth_error(error)
            data, status = response

            assert status == 401
            assert data.json == {"error": "Unauthorized access"}


class TestAuthDecorator:
    """Test the requires_auth decorator functionality."""

    def test_missing_authorization_header(self):
        """Test request without Authorization header."""
        with app.app.test_request_context("/test"):
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            with pytest.raises(AuthError) as exc_info:
                test_endpoint()

            assert "Missing bearer token" in str(exc_info.value.message)

    def test_invalid_bearer_format(self):
        """Test request with invalid Authorization header format."""
        with app.app.test_request_context(
            "/test", headers={"Authorization": "Invalid token"}
        ):
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            with pytest.raises(AuthError) as exc_info:
                test_endpoint()

            assert "Missing bearer token" in str(exc_info.value.message)

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_invalid_token(self, mock_decode, mock_get_jwks):
        """Test request with invalid JWT token."""
        mock_get_jwks.return_value = Mock()
        mock_decode.side_effect = Exception("Invalid token")

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer invalid_token"}
        ):
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            with pytest.raises(AuthError) as exc_info:
                test_endpoint()

            assert "Invalid token" in str(exc_info.value.message)

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_invalid_issuer(self, mock_decode, mock_get_jwks):
        """Test request with token from wrong issuer."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": "https://wrong-issuer.com",
            "aud": app.AUDIENCE,
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ):
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            with pytest.raises(AuthError) as exc_info:
                test_endpoint()

            assert "Bad issuer" in str(exc_info.value.message)

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_invalid_audience_string(self, mock_decode, mock_get_jwks):
        """Test request with token for wrong audience (string format)."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": "wrong-audience",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ):
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            with pytest.raises(AuthError) as exc_info:
                test_endpoint()

            assert "Bad audience" in str(exc_info.value.message)

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_invalid_audience_list(self, mock_decode, mock_get_jwks):
        """Test request with token for wrong audience (list format)."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": ["other-client", "another-client"],
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ):
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            with pytest.raises(AuthError) as exc_info:
                test_endpoint()

            assert "Bad audience" in str(exc_info.value.message)

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_insufficient_roles(self, mock_decode, mock_get_jwks):
        """Test request without required roles."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": "testuser",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ):
            decorator = requires_auth(required_roles=["admin"])

            @decorator
            def test_endpoint():
                return "Success"

            with pytest.raises(AuthError) as exc_info:
                test_endpoint()

            assert "Insufficient role" in str(exc_info.value.message)

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_valid_token_no_roles_required(self, mock_decode, mock_get_jwks):
        """Test valid token without role requirements."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": "testuser",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ) as ctx:
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            result = test_endpoint()
            assert result == "Success"
            assert ctx.request.claims == mock_claims

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_valid_token_with_realm_roles(self, mock_decode, mock_get_jwks):
        """Test valid token with required realm roles."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["admin", "user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": "adminuser",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ) as ctx:
            decorator = requires_auth(required_roles=["admin"])

            @decorator
            def test_endpoint():
                return "Success"

            result = test_endpoint()
            assert result == "Success"
            assert ctx.request.claims == mock_claims

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_valid_token_with_client_roles(self, mock_decode, mock_get_jwks):
        """Test valid token with required client roles."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["admin", "write"]}},
            "preferred_username": "clientadmin",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ) as ctx:
            decorator = requires_auth(required_roles=["admin"])

            @decorator
            def test_endpoint():
                return "Success"

            result = test_endpoint()
            assert result == "Success"
            assert ctx.request.claims == mock_claims

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_valid_token_with_list_audience(self, mock_decode, mock_get_jwks):
        """Test valid token with audience as list."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": ["web", app.AUDIENCE, "other"],
            "realm_access": {"roles": ["user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": "testuser",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_request_context(
            "/test", headers={"Authorization": "Bearer valid_token"}
        ) as ctx:
            decorator = requires_auth()

            @decorator
            def test_endpoint():
                return "Success"

            result = test_endpoint()
            assert result == "Success"
            assert ctx.request.claims == mock_claims


class TestAPIEndpoints:
    """Test the API endpoints."""

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_hello_endpoint_success(self, mock_decode, mock_get_jwks):
        """Test successful /hello endpoint call."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": "testuser",
            "sub": "user123",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_client() as client:
            response = client.get(
                "/hello", headers={"Authorization": "Bearer valid_token"}
            )

            assert response.status_code == 200
            assert "Hello, testuser" in response.get_data(as_text=True)
            assert "Your token is valid" in response.get_data(as_text=True)

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_hello_endpoint_with_sub_fallback(self, mock_decode, mock_get_jwks):
        """Test /hello endpoint falls back to sub when preferred_username is missing."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": None,
            "sub": "user123",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_client() as client:
            response = client.get(
                "/hello", headers={"Authorization": "Bearer valid_token"}
            )

            assert response.status_code == 200
            assert "Hello, user123" in response.get_data(as_text=True)

    def test_hello_endpoint_unauthorized(self):
        """Test /hello endpoint without authentication."""
        with app.app.test_client() as client:
            response = client.get("/hello")

            assert response.status_code == 401
            assert response.get_json()["error"] == "Missing bearer token"

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_admin_endpoint_success(self, mock_decode, mock_get_jwks):
        """Test successful /admin endpoint call with admin role."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["admin", "user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": "adminuser",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_client() as client:
            response = client.get(
                "/admin", headers={"Authorization": "Bearer valid_token"}
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data["ok"] is True
            assert data["admin"] is True

    @patch("app.get_jwks")
    @patch("app.jwt.decode")
    def test_admin_endpoint_insufficient_roles(self, mock_decode, mock_get_jwks):
        """Test /admin endpoint without admin role."""
        mock_get_jwks.return_value = Mock()
        mock_claims = Mock()
        mock_claims.get.side_effect = lambda key, default=None: {
            "iss": app.ISSUER,
            "aud": app.AUDIENCE,
            "realm_access": {"roles": ["user"]},
            "resource_access": {app.AUDIENCE: {"roles": ["read"]}},
            "preferred_username": "normaluser",
        }.get(key, default)
        mock_decode.return_value = mock_claims

        with app.app.test_client() as client:
            response = client.get(
                "/admin", headers={"Authorization": "Bearer valid_token"}
            )

            assert response.status_code == 401
            assert response.get_json()["error"] == "Insufficient role"

    def test_admin_endpoint_unauthorized(self):
        """Test /admin endpoint without authentication."""
        with app.app.test_client() as client:
            response = client.get("/admin")

            assert response.status_code == 401
            assert response.get_json()["error"] == "Missing bearer token"


class TestEnvironmentVariables:
    """Test environment variable configuration."""

    def test_default_environment_values(self):
        """Test that default environment values are set correctly."""
        assert app.KC_URL == "http://localhost:8080"
        assert app.REALM == "universal"
        assert app.AUDIENCE == "api"
        assert app.ISSUER == "http://localhost:8080/realms/universal"
        assert (
            app.JWKS_URL
            == "http://localhost:8080/realms/universal/protocol/openid-connect/certs"
        )

    @patch.dict(
        "os.environ",
        {
            "KC_URL": "https://custom-keycloak.com",
            "KC_REALM": "custom-realm",
            "KC_AUDIENCE": "custom-api",
        },
    )
    def test_custom_environment_values(self):
        """Test that custom environment values are used."""
        # Need to reload the module to pick up new env vars
        import importlib

        importlib.reload(app)

        assert app.KC_URL == "https://custom-keycloak.com"
        assert app.REALM == "custom-realm"
        assert app.AUDIENCE == "custom-api"
        assert app.ISSUER == "https://custom-keycloak.com/realms/custom-realm"
    def test_custom_environment_values_monkeypatch(self, monkeypatch):
        """Test that custom environment values are used."""
        monkeypatch.setenv("KC_URL", "https://custom-keycloak.com")
        monkeypatch.setenv("KC_REALM", "custom-realm")
        monkeypatch.setenv("KC_AUDIENCE", "custom-api")
        # Import app after patching environment variables
        import importlib
        app_mod = importlib.import_module("app")

        assert app_mod.KC_URL == "https://custom-keycloak.com"
        assert app_mod.REALM == "custom-realm"
        assert app_mod.AUDIENCE == "custom-api"
        assert app_mod.ISSUER == "https://custom-keycloak.com/realms/custom-realm"
        assert (
            app_mod.JWKS_URL
            == "https://custom-keycloak.com/realms/custom-realm/protocol/openid-connect/certs"
        )


if __name__ == "__main__":
    pytest.main([__file__])
