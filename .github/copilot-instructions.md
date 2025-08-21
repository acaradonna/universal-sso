# Universal SSO

Universal SSO is a demonstration application showcasing Single Sign-On (SSO) integration using OpenID Connect. The application consists of a React web frontend, Python Flask API backend, and Keycloak identity provider with PostgreSQL database.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Setup Commands - NEVER CANCEL these operations:
- `docker compose up db keycloak -d` -- starts infrastructure (PostgreSQL + Keycloak). Takes 19 seconds total. NEVER CANCEL. Set timeout to 60+ seconds.
- `cd web && npm install` -- installs web dependencies. Takes 12 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- `cd web && npm run build` -- builds web application. Takes 1 second. Set timeout to 30+ seconds.
- `cd api && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt` -- sets up API environment. Takes 30 seconds. NEVER CANCEL. Set timeout to 120+ seconds.

### Development Server Commands:
- Web dev server: `cd web && npm run dev` -- starts on port 5173. Hot reload enabled.
- API dev server: `cd api && source venv/bin/activate && python app.py` -- starts on port 5000. Debug mode enabled.
- Infrastructure: `docker compose up db keycloak -d` -- Keycloak on port 8080, PostgreSQL on 5432.

### Build and Production Commands:
- Web build: `cd web && npm run build` -- produces `dist/` directory. Takes 1 second.
- Web preview: `cd web && npm run preview` -- serves built application on port 5173.

## Critical Setup Requirements

### Docker Infrastructure (Required):
The application REQUIRES Keycloak and PostgreSQL to be running. Always start with:
```bash
docker compose up db keycloak -d
```
Wait 19 seconds for Keycloak to fully initialize before proceeding. Check readiness with:
```bash
curl -I http://localhost:8080/
```

### Keycloak Realm Configuration (Manual Setup Required):
**CRITICAL**: The "universal" realm does not exist by default and must be manually configured:

1. Access Keycloak admin console: http://localhost:8080/admin/
2. Default credentials: admin/change_me_admin (from docker-compose.yml)
3. Create realm named "universal"
4. Create client named "web" with these settings:
   - Client ID: web
   - Valid redirect URIs: http://localhost:5173/callback
   - Post logout redirect URIs: http://localhost:5173/
   - Web origins: http://localhost:5173
5. Create client named "api" for the backend API
6. Create test users in the realm for validation

### Environment Variables:
- Web app uses configuration from `web/src/.env.local`:
  - VITE_KC_URL=http://localhost:8080
  - VITE_KC_REALM=universal
  - VITE_KC_CLIENT_ID=web
  - VITE_REDIRECT_URI=http://localhost:5173/callback
  - VITE_POST_LOGOUT_REDIRECT_URI=http://localhost:5173/

## Docker Limitations and Workarounds

### Known Issues:
- **Web container Docker build FAILS** due to rollup native modules compatibility with Alpine Linux and certificate issues
- **Workaround**: Run web application locally using `npm run dev` instead of Docker
- **API container builds successfully** using Python 3.11-slim base image

### Recommended Development Setup:
1. **Infrastructure**: Use Docker (`docker compose up db keycloak -d`)
2. **Web app**: Run locally (`cd web && npm run dev`)
3. **API**: Run locally (`cd api && source venv/bin/activate && python app.py`)

## Validation Scenarios

### ALWAYS test these scenarios after making changes:

#### Basic Development Workflow:
1. Start infrastructure: `docker compose up db keycloak -d` (wait 19 seconds)
2. Install and start web: `cd web && npm install && npm run dev` 
3. Install and start API: `cd api && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py`
4. Verify all services respond:
   - Web: http://localhost:5173/ (should show React app)
   - API: http://localhost:5000/hello (should return auth error)
   - Keycloak: http://localhost:8080/ (should redirect to admin)

#### SSO Authentication Flow (requires manual Keycloak setup):
1. Complete basic development workflow above
2. Configure "universal" realm in Keycloak (see Critical Setup Requirements)
3. Access http://localhost:5173/
4. Click "Login" button 
5. Should redirect to Keycloak login
6. Login with test user
7. Should redirect back to app with user info displayed
8. Click "Call Protected API" button
9. Should display API response with username

#### Build and Production Validation:
1. Build web app: `cd web && npm run build` (creates `dist/` directory)
2. Preview built app: `cd web && npm run preview`
3. Test production build at http://localhost:5173/

## Common Tasks and Outputs

### Repository Structure:
```
.
├── README.md (empty)
├── .env.example
├── docker-compose.yml
├── api/
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── venv/ (created after setup)
├── web/
│   ├── package.json  
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   ├── node_modules/ (created after npm install)
│   └── dist/ (created after build)
├── keycloak/
│   └── theme/
│       └── realm-export.yml (empty)
└── reverse-proxy/
    └── caddy/
        └── Caddyfile
```

### Key Files to Monitor:
- `web/src/App.jsx` -- main React application logic
- `web/src/oidc.js` -- OpenID Connect configuration
- `api/app.py` -- Flask API with JWT authentication
- `docker-compose.yml` -- infrastructure configuration

### Build Dependencies:
- **Node.js**: 20+ (for web application)
- **Python**: 3.11+ (for API)
- **Docker**: Latest with Compose plugin (for infrastructure)

### Timing Expectations:
- Docker infrastructure startup: 19 seconds total
- Web npm install: 12 seconds  
- Web build: 1 second
- API pip install: 30 seconds
- Keycloak realm configuration: 5 minutes manual setup

## Troubleshooting

### Common Issues:
1. **"Realm does not exist" error**: Manual Keycloak realm setup required (see Critical Setup Requirements)
2. **Web Docker build fails**: Use local development instead (`npm run dev`)
3. **API auth errors**: Ensure Keycloak is running and realm is configured
4. **Connection refused errors**: Wait for services to fully start (19 seconds for infrastructure)

### Health Checks:
- Keycloak ready: `curl -I http://localhost:8080/` (should return HTTP 302)
- API running: `curl http://localhost:5000/hello` (should return auth error JSON)
- Web app running: `curl http://localhost:5173/` (should return HTML)

### Clean Restart:
```bash
docker compose down
docker compose up db keycloak -d
# Wait 19 seconds
cd web && npm run dev
cd api && source venv/bin/activate && python app.py
```

## Important Notes
- **NEVER CANCEL** long-running commands - builds may take time due to dependency downloads
- Always wait for Keycloak to fully initialize (19 seconds) before testing authentication
- The application demonstrates OAuth2/OpenID Connect flow but requires manual Keycloak configuration
- No automated tests are present in the repository
- Use hybrid Docker/local development setup for best results