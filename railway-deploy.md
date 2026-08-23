# Railway and GitHub Pages Deployment

Deploy the two backend services to Railway from `Arvindkumar4545/AI-RISK-MANAGER`, then deploy `web` to GitHub Pages.

| Service | Railway root directory | Dockerfile | Port | Health |
|---|---|---|---:|---|
| `atlas-risk-ml` | `ml-backend` | `Dockerfile` | `$PORT` | `/health` |
| `atlas-risk-api` | `node-backend` | `Dockerfile` | `$PORT` | `/health` |
| `atlas-risk-web` | GitHub Pages | `.github/workflows/deploy-web.yml` | n/a | `/AI-RISK-MANAGER/` |

Create two Railway services from the same GitHub repository. Set each service's root directory to the value above and enable automatic deploys from `main`.

For the API service, set `MONGO_URI`, `JWT_SECRET`, and `ML_URL`. `ML_URL` should be the public Railway URL for the ML service, such as `https://atlas-risk-ml-production.up.railway.app`.

For the ML service, set `MODEL_ARTIFACT_URL` to a private ZIP containing the three pickle artifacts. The health endpoint must report `model_loaded: true` before production use.

Set the GitHub repository variable `VITE_API_URL` to the public Railway API URL. The Pages workflow uses it when building the frontend.