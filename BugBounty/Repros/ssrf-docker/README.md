# Dockerized ngmodule SSR repro (production build)

This Dockerfile builds the **stock ngmodule SSR example** in production mode and runs the built server bundle.
It is intended for the containerized repro phase (no execution performed yet).

## Build (manual)
From repo root:

```bash
docker build -f BugBounty/Repros/ssrf-docker/Dockerfile -t ssrf-ngmodule-prod .
```

## Run (manual)
```bash
docker run --rm -p 4206:4206 ssrf-ngmodule-prod
```

## Notes
- The Dockerfile symlinks `dist/packages-dist/*` into `node_modules/@angular/*` to match the repo layout.
- If a production build target is unavailable, document the fallback to a dev build.
