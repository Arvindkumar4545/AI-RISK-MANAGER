# Deployment Audit

**Project:** Atlas Risk Manager  
**Audit date:** 2026-08-23  
**Target:** GitHub -> Railway backends -> GitHub Pages frontend -> UptimeRobot

## Status

| Area | Status | Evidence / action |
|---|---|---|
| GitHub source | Ready | Repository: `Arvindkumar4545/AI-RISK-MANAGER`; deploy from `main`. |
| ML backend | Ready | FastAPI Dockerfile, Railway config, `/health`, configurable model artifacts. |
| Node backend | Ready | Express Dockerfile, Railway config, JWT/bcrypt/Mongoose routes, `/health`. |
| Web frontend | Ready | Vite base path, GitHub Pages workflow, production build. |
| Mobile app | Ready | Reads `EXPO_PUBLIC_API_URL`. |
| CI | Ready | GitHub Actions validates Python, Node, and web build. |
| Railway deployment | Pending account action | Create two services with `ml-backend` and `node-backend` root directories. |
| GitHub Pages deployment | Pending account action | Enable Pages with GitHub Actions and set repository variable `VITE_API_URL`. |
| MongoDB Atlas | Required secret | Set `MONGO_URI` on Railway API service. |
| Model artifacts | Required release input | Set `MODEL_ARTIFACT_URL` on Railway ML service. |
| UptimeRobot | Post-deploy setup | Add the public Railway and GitHub Pages URLs. |

## Railway Backend Deployment

Create two services from the GitHub repository using the Dockerfile builder:

| Service | Root directory | Port | Health path |
|---|---|---:|---|
| `atlas-risk-ml` | `ml-backend` | `$PORT` | `/health` |
| `atlas-risk-api` | `node-backend` | `$PORT` | `/health` |

The service Dockerfiles use Railway's injected `$PORT`. Set the following variables:

**ML service**

- `MODEL_ARTIFACT_URL`: private ZIP containing `risk_model.pkl`, `shap_explainer.pkl`, and `preprocessor.pkl`.

**API service**

- `MONGO_URI`: MongoDB Atlas connection string.
- `JWT_SECRET`: high-entropy production secret.
- `ML_URL`: public Railway ML service URL, for example `https://atlas-risk-ml-production.up.railway.app`.

Verify ML `/health` reports `model_loaded: true` and API `/health` reports `database: mongodb`. Demo and memory modes are development-only.

## GitHub Pages Frontend

1. Push the repository to `main`.
2. In GitHub, open **Settings -> Pages** and choose **GitHub Actions** as the source.
3. In **Settings -> Secrets and variables -> Actions -> Variables**, add `VITE_API_URL` with the public Railway API URL.
4. The `Deploy web to GitHub Pages` workflow builds `web` and publishes it automatically.

Expected website URL:

```text
https://arvindkumar4545.github.io/AI-RISK-MANAGER/
```

The URL is case-sensitive and depends on the repository name.

## UptimeRobot / UptimeBot

Use `monitoring/uptimerobot-monitors.json` as the template. Create HTTP monitors for:

- `https://<ml-service>.up.railway.app/health`
- `https://<api-service>.up.railway.app/health`
- `https://arvindkumar4545.github.io/AI-RISK-MANAGER/`

Use a five-minute interval and alert on non-200 responses. Require `model_loaded:true` for ML and `database:mongodb` for the API.

## Release Verification

```powershell
curl.exe -s https://<ml-service>.up.railway.app/health
curl.exe -s https://<api-service>.up.railway.app/health
curl.exe -s -o NUL -w "%{http_code}" https://arvindkumar4545.github.io/AI-RISK-MANAGER/
```

Then verify signup, login, prediction with `top_factors`, stress testing, and report history.

## Known Deployment Limits

- Actual Railway URLs are created only after Railway creates the services.
- GitHub Pages cannot run the backend; its `VITE_API_URL` must point to Railway.
- Without model artifacts, ML intentionally exposes demo mode and must not be used for lending decisions.
- Without MongoDB, API persistence is temporary in-memory development storage.
