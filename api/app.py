import os
from functools import wraps
from flask import Flask, request, jsonify
import requests
from authlib.jose import JsonWebKey, jwt

KC_URL = os.getenv('KC_URL', 'http://localhost:8080')
REALM = os.getenv('KC_REALM', 'universal')
AUDIENCE = os.getenv('KC_AUDIENCE', 'api')  # Keycloak clientId for this API
ISSUER = f"{KC_URL}/realms/{REALM}"
JWKS_URL = f"{ISSUER}/protocol/openid-connect/certs"

# Cache JWKS
_jwks = None

def get_jwks():
    global _jwks
    if _jwks is None:
        jwks_resp = requests.get(JWKS_URL, timeout=5)
        jwks_resp.raise_for_status()
        _jwks = JsonWebKey.import_key_set(jwks_resp.json())
    return _jwks

app = Flask(__name__)

class AuthError(Exception):
    status_code = 401
    def __init__(self, message):
        super().__init__(message)
        self.message = message

@app.errorhandler(AuthError)
def handle_auth_error(e):
    return jsonify({"error": e.message}), e.status_code

def requires_auth(required_roles=None):
    required_roles = required_roles or []
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth = request.headers.get('Authorization', '')
            if not auth.startswith('Bearer '):
                raise AuthError('Missing bearer token')
            token = auth.split(' ', 1)[1]
            try:
                claims = jwt.decode(token, get_jwks())
                claims.validate()
            except Exception as ex:
                raise AuthError(f'Invalid token: {ex}')

            if claims.get('iss') != ISSUER:
                raise AuthError('Bad issuer')
            aud = claims.get('aud')
            if isinstance(aud, str) and aud != AUDIENCE:
                raise AuthError('Bad audience')
            if isinstance(aud, list) and AUDIENCE not in aud:
                raise AuthError('Bad audience')

            roles = set()
            # Realm roles
            realm_access = claims.get('realm_access', {})
            roles.update(realm_access.get('roles', []))
            # Client roles
            res_access = claims.get('resource_access', {})
            client_roles = res_access.get(AUDIENCE, {}).get('roles', [])
            roles.update(client_roles)

            if required_roles and not (set(required_roles) & roles):
                raise AuthError('Insufficient role')

            request.claims = claims
            return fn(*args, **kwargs)
        return wrapper
    return decorator

@app.get('/hello')
@requires_auth()
def hello():
    sub = request.claims.get('preferred_username') or request.claims.get('sub')
    return f"Hello, {sub}. Your token is valid."

@app.get('/admin')
@requires_auth(required_roles=['admin'])
def admin():
    return jsonify({"ok": True, "admin": True})

if __name__ == '__main__':
    # Only for dev. Use a WSGI server (gunicorn/uvicorn) in prod
    app.run(host='0.0.0.0', port=5000, debug=True)
