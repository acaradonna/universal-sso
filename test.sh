#!/bin/bash

# Universal SSO Test Runner Script
# Simple shell script for running all tests

set -e  # Exit on first error

echo "🧪 Universal SSO Test Runner"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "Makefile" || ! -d "api" || ! -d "web" ]]; then
    print_error "Please run this script from the universal-sso root directory"
    exit 1
fi

# Parse command line arguments
COVERAGE=false
QUICK=false
VERBOSE=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        --quick|-q)
            QUICK=true
            VERBOSE=false
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --coverage, -c    Generate coverage reports"
            echo "  --quick, -q       Run tests quickly (minimal output)"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                Run all tests with verbose output"
            echo "  $0 --quick       Run all tests with minimal output"
            echo "  $0 --coverage    Run all tests and generate coverage reports"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Start testing
print_status "Starting test suite execution..."
echo ""

# Test API
print_status "Running Flask API tests..."
cd api

if [[ "$COVERAGE" == true ]]; then
    print_status "Running API tests with coverage..."
    if python3 -m pytest --cov=. --cov-report=html --cov-report=term; then
        print_success "API tests with coverage completed"
        print_status "Coverage report generated in api/htmlcov/"
    else
        print_error "API tests failed"
        exit 1
    fi
elif [[ "$QUICK" == true ]]; then
    if python3 -m pytest --quiet; then
        print_success "API tests completed (quick mode)"
    else
        print_error "API tests failed"
        exit 1
    fi
else
    if python3 -m pytest -v --tb=short; then
        print_success "API tests completed"
    else
        print_error "API tests failed"
        exit 1
    fi
fi

cd ..
echo ""

# Test Web
print_status "Running React frontend tests..."
cd web

if [[ "$COVERAGE" == true ]]; then
    print_status "Running web tests with coverage..."
    if npm run coverage; then
        print_success "Web tests with coverage completed"
        print_status "Coverage report generated in web/coverage/"
    else
        print_error "Web tests failed"
        exit 1
    fi
elif [[ "$QUICK" == true ]]; then
    if npm run test:run --reporter=basic; then
        print_success "Web tests completed (quick mode)"
    else
        print_error "Web tests failed"
        exit 1
    fi
else
    if npm run test:run; then
        print_success "Web tests completed"
    else
        print_error "Web tests failed"
        exit 1
    fi
fi

cd ..
echo ""

# Final success message
print_success "🎉 All tests completed successfully!"

if [[ "$COVERAGE" == true ]]; then
    echo ""
    print_status "Coverage reports generated:"
    print_status "  API: api/htmlcov/index.html"
    print_status "  Web: web/coverage/index.html"
fi

echo ""
print_status "Test execution summary:"
print_status "  ✅ Flask API tests: PASSED"
print_status "  ✅ React frontend tests: PASSED"
echo ""