# Universal SSO

A demonstration Single Sign-On (SSO) implementation using Keycloak, Flask API, and React frontend with comprehensive unit test coverage.

## Architecture

- **Identity Provider**: Keycloak 24.0 with PostgreSQL backend
- **API Backend**: Python Flask with JWT authentication and role-based authorization
- **Frontend**: React 18 with OpenID Connect client integration
- **Reverse Proxy**: Caddy 2 with automatic HTTPS/TLS

## Quick Start

1. **Start the application**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**:
   - Web App: http://app.example.com
   - API: http://api.example.com  
   - Keycloak: http://auth.example.com

## Testing

This project includes comprehensive unit tests for both the Flask API and React frontend.

### Run All Tests (Multiple Options)

```bash
# Option 1: Using Makefile (recommended)
make test

# Option 2: Using npm scripts  
npm run test

# Option 3: Using shell script
./test.sh
```

### Individual Test Commands

```bash
# API tests only
make test-api
# or
npm run test:api
# or
cd api && python -m pytest

# Frontend tests only  
make test-web
# or
npm run test:web
# or
cd web && npm run test:run
```

### Coverage Reports

```bash
# Generate coverage for all components
make coverage

# Individual coverage
make coverage-api  # Generates api/htmlcov/index.html
make coverage-web  # Generates web/coverage/index.html
```

### Quick Test Options

```bash
# Minimal output
make test-quick
npm run test:quick
./test.sh --quick

# With coverage
./test.sh --coverage
```

## Test Coverage

### Flask API Tests (`api/test_app.py`)
-  JWT authentication and token validation
-  JWKS key retrieval and caching
-  Role-based authorization (realm and client roles)
-  API endpoint testing (`/hello`, `/admin`)
-  Error handling and custom exceptions
-  Environment configuration

### React Frontend Tests (`web/src/*.test.jsx`)
-  Authentication flows (login/logout)
-  Protected route handling
-  OIDC configuration and UserManager setup
-  API calls with Bearer token authentication
-  Error handling and user state management
-  Component rendering and user interactions

## Development

### Install Dependencies

```bash
# All dependencies
make install-deps

# API only
cd api && pip install -r requirements.txt

# Frontend only  
cd web && npm install
```

### Development Servers

```bash
# API development server
cd api && python app.py

# Frontend development server
cd web && npm run dev
```

## Available Make Targets

Run `make help` to see all available commands:

```
help                 Show this help message
test                 Run all tests (API + Web)
test-api            Run Python Flask API tests
test-web            Run React frontend tests
install-deps        Install all dependencies
coverage            Generate coverage reports for all components
test-ci             Run tests in CI mode (non-interactive)
clean               Clean up test artifacts and coverage reports
test-quick          Run all tests quickly (minimal output)
dev-setup           Set up development environment
```

## CI/CD Integration

For continuous integration, use:

```bash
make test-ci
```

This runs tests in non-interactive mode suitable for CI environments.

## License

MIT