# Universal SSO Test Runner
# Industry-standard Makefile for multi-language test orchestration

.PHONY: help test test-api test-web install-deps clean coverage test-ci

# Default target
help: ## Show this help message
	@echo "Universal SSO Test Commands"
	@echo "=========================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Main test target - runs all tests
test: test-api test-web ## Run all tests (API + Web)
	@echo "✅ All tests completed successfully!"

# API tests
test-api: ## Run Python Flask API tests
	@echo "🧪 Running Flask API tests..."
	@cd api && python3 -m pytest -v --tb=short
	@echo "✅ API tests completed"

# Web tests  
test-web: ## Run React frontend tests
	@echo "🧪 Running React frontend tests..."
	@cd web && npm run test:run
	@echo "✅ Web tests completed"

# Linting targets
lint: lint-api lint-web ## Run all linting

lint-api: ## Run Python linting (flake8, black check, isort check)
	@echo "🔍 Linting API code..."
	@cd api && PATH="$$HOME/.local/bin:$$PATH" python3 -m flake8 . || true
	@cd api && PATH="$$HOME/.local/bin:$$PATH" python3 -m black --check . || true
	@cd api && PATH="$$HOME/.local/bin:$$PATH" python3 -m isort --check-only . || true
	@echo "✅ API linting completed"

lint-web: ## Run frontend linting (ESLint)
	@echo "🔍 Linting Web code..."
	@cd web && npm run lint || true
	@echo "✅ Web linting completed"

# Auto-fixing targets
fix: fix-api fix-web ## Auto-fix all linting issues

fix-api: ## Auto-fix Python code formatting
	@echo "🔧 Auto-fixing API code..."
	@cd api && PATH="$$HOME/.local/bin:$$PATH" python3 -m black .
	@cd api && PATH="$$HOME/.local/bin:$$PATH" python3 -m isort .
	@echo "✅ API auto-fix completed"

fix-web: ## Auto-fix frontend code formatting  
	@echo "🔧 Auto-fixing Web code..."
	@cd web && npm run lint:fix
	@echo "✅ Web auto-fix completed"

# Install dependencies
install-deps: install-api-deps install-web-deps ## Install all dependencies

install-api-deps: ## Install Python API dependencies
	@echo "📦 Installing API dependencies..."
	@cd api && pip install -r requirements.txt

install-web-deps: ## Install Node.js web dependencies
	@echo "📦 Installing Web dependencies..."
	@cd web && npm install

# Coverage reports
coverage: coverage-api coverage-web ## Generate coverage reports for all components

coverage-api: ## Generate API test coverage report
	@echo "📊 Generating API coverage report..."
	@cd api && python3 -m pytest --cov=. --cov-report=html --cov-report=term
	@echo "📊 API coverage report generated in api/htmlcov/"

coverage-web: ## Generate web test coverage report
	@echo "📊 Generating Web coverage report..."
	@cd web && npm run coverage
	@echo "📊 Web coverage report generated in web/coverage/"

# CI-friendly test target (no interactive output)
test-ci: ## Run tests in CI mode (non-interactive)
	@echo "🤖 Running tests in CI mode..."
	@cd api && python3 -m pytest --tb=short --quiet
	@cd web && npm run test:run --reporter=basic
	@echo "✅ CI tests completed successfully!"

# Clean up generated files
clean: ## Clean up test artifacts and coverage reports
	@echo "🧹 Cleaning up test artifacts..."
	@cd api && rm -rf .pytest_cache __pycache__ htmlcov .coverage
	@cd web && rm -rf coverage node_modules/.cache
	@echo "✅ Cleanup completed"

# Quick test (just run tests without verbose output)
test-quick: ## Run all tests quickly (minimal output)
	@cd api && python3 -m pytest --quiet
	@cd web && npm run test:run --reporter=basic
	@echo "✅ Quick tests completed!"

# Development helpers
dev-setup: install-deps ## Set up development environment
	@echo "🛠️  Development environment ready!"

# Individual test file runners
test-api-auth: ## Run only API authentication tests  
	@cd api && python3 -m pytest test_app.py::TestAuthDecorator -v

test-api-endpoints: ## Run only API endpoint tests
	@cd api && python3 -m pytest test_app.py::TestAPIEndpoints -v

test-web-app: ## Run only App component tests
	@cd web && npm run test:run -- App.test.jsx

test-web-protected: ## Run only ProtectedRoute tests
	@cd web && npm run test:run -- ProtectedRoute.test.jsx

test-web-oidc: ## Run only OIDC configuration tests
	@cd web && npm run test:run -- oidc.test.js