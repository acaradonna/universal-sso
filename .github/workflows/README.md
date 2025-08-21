# CI and Security Scanning

This repository uses GitHub Actions to:

- Build the web (Vite/React) app and compile the API on each push and PR.
- Build container images for API (and Reverse Proxy if present).
- Run Trivy to scan both the filesystem and built images for known vulnerabilities.
- Upload SARIF results to GitHub's Security tab and summarize outcomes in the workflow run.

Files:

- `.github/workflows/ci-security.yml`

Notes:

- Trivy runs with `severity: CRITICAL,HIGH` and `ignore-unfixed: true` for actionable noise reduction.
- SARIF outputs are uploaded so results appear in the repository's Security/Code scanning alerts.
- No images are pushed by CI; tags are local to the workflow run.
- Web build uses Node 20; API targets Python 3.12.
