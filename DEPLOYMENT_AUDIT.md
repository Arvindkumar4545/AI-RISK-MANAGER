# Deployment Audit

**Project:** Atlas Risk Manager  
**Target:** GitHub Pages frontend -> Vercel Node API -> Hugging Face FastAPI -> MongoDB Atlas

| Area | Status | Evidence / action |
|---|---|---|
| GitHub source | Ready | Deploy from `main`. |
| ML backend | Ready | FastAPI Dockerfile listens on Hugging Face port `7860`; `/health` is available. |
| Node backend | Ready | Express app exports a Vercel serverless handler via `node-backend/api/index.js`. |
| Web frontend | Ready | Vite base path and GitHub Pages workflow are configured. |
| Vercel deployment | Pending account action | Import `node-backend` and set `MONGO_URI`, `JWT_SECRET`, `ML_URL`, and `CORS_ORIGIN`. |
| Hugging Face deployment | Pending account action | Create a Docker Space using `ml-backend`; set `MODEL_ARTIFACT_URL` if needed. |
| GitHub Pages deployment | Pending account action | Enable Pages with GitHub Actions and set Actions variable `VITE_API_URL`. |
| MongoDB Atlas | Required secret | Use the Atlas SRV connection string only as the Vercel `MONGO_URI` variable. |
| UptimeRobot | Post-deploy setup | Monitor the Hugging Face, Vercel, and GitHub Pages health URLs. |

## Release checks

- Hugging Face `/health` returns `model_loaded: true` for production scoring.
- Vercel `/health` returns `database: mongodb`.
- GitHub Pages loads from `https://arvindkumar4545.github.io/AI-RISK-MANAGER/`.
- Signup, login, prediction, stress testing, and report history work end to end.

Without model artifacts, the ML service intentionally runs in demo mode. Without MongoDB, the API uses temporary memory storage and reports are lost on restart.

See [deployment.md](deployment.md) for the complete setup and verification commands.
