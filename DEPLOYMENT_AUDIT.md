# Deployment Audit

**Project:** Atlas Risk Manager  
**Audit date:** 2026-08-23  
**Target:** GitHub -> Render -> UptimeRobot (UptimeBot)

## Current Status

| Area | Status | Evidence / action |
|---|---|---|
| Repository structure | Ready | Separate `ml-backend`, `node-backend`, `web`, and `mobile` projects exist. |
| Notebook format | Ready | `train_model.ipynb` is valid JSON and has Python/Markdown cell metadata. |
| ML health endpoint | Ready | `GET /health` on FastAPI. |
| Node health endpoint | Ready | `GET /health` reports MongoDB or development memory mode. |
| Web build | Ready | `npm run build` succeeds locally. |
| GitHub CI | Added | `.github/workflows/ci.yml` validates Python, Node, and React. |
| Render blueprint | Added | `render.yaml` defines ML, API, and static web services. |
| MongoDB production storage | Action required | Create MongoDB Atlas database and set `MONGO_URI` in Render. |
| Production model artifacts | Action required | Run the notebook with Kaggle data and securely ship the three `.pkl` files. |
| Production secrets | Action required | Set a long random `JWT_SECRET`; never commit `.env` files. |
| Uptime monitoring | Action required | Add Render health URLs to UptimeRobot. |
| Mobile production URL | Action required | Set the deployed Node API URL in `mobile/App.js` or move it to app config. |

## GitHub Deployment Checklist

1. Create a GitHub repository and push this project to the `main` branch.
2. Confirm `.gitignore` excludes `.env`, CSV data, and pickle artifacts.
3. Confirm the Actions workflow is green before deploying.
4. Do not commit Kaggle credentials, MongoDB credentials, JWT secrets, or private applicant data.
5. Treat `risk_model.pkl`, `shap_explainer.pkl`, and `preprocessor.pkl` as release artifacts. Store them in a private artifact store or attach them through the Render deployment process.

## Render Deployment

1. In Render, choose **New -> Blueprint** and select the GitHub repository.
2. Render reads `render.yaml` and creates:
   - `atlas-risk-ml` on port `8000` internally.
   - `atlas-risk-api` on port `4000` with MongoDB and JWT environment variables.
   - `atlas-risk-web` as a static site.
3. Create a MongoDB Atlas database and allow Render's outbound connections. Set `MONGO_URI` to the Atlas connection string.
4. Set `JWT_SECRET` to a high-entropy secret.
5. Verify `atlas-risk-ml/health` reports `model_loaded: true`. If it reports false, the ML service is running in demo fallback mode and must not be used for production decisions.
6. Confirm the Node service health response reports `database: mongodb`.
7. Set the web service's `VITE_API_URL` to the public Node API URL and redeploy the static site.

### Required Render environment variables

**atlas-risk-api**

- `MONGO_URI`
- `JWT_SECRET`
- `ML_URL` (provided by the blueprint; verify it points to the ML service)

**atlas-risk-ml**

- `MODEL_ARTIFACT_URL` (private ZIP URL containing all three pickle artifacts)

**atlas-risk-web**

- `VITE_API_URL` (the public Node API URL, for example `https://atlas-risk-api.onrender.com`)

## UptimeRobot / UptimeBot Monitoring

Create HTTP(s) monitors for:

- `https://<ml-service>.onrender.com/health`
- `https://<api-service>.onrender.com/health`
- `https://<web-service>.onrender.com/`

Recommended settings:

- Check interval: 5 minutes.
- Alert contacts: engineering email and incident channel.
- Expected response: HTTP `200`.
- API health body should include `"status":"ok"` and `"database":"mongodb"`.
- ML health body should include `"status":"ok"` and `"model_loaded":true`.

Use UptimeRobot's webhook or email alert integration. If by “UptimeBot” you mean a different monitoring provider, use the same URLs and expected response checks.

## Release Verification

Run these checks after every Render deploy:

```powershell
curl.exe -s https://<ml-service>.onrender.com/health
curl.exe -s https://<api-service>.onrender.com/health
curl.exe -s -o NUL -w "%{http_code}" https://<web-service>.onrender.com/
```

Then verify the user journey:

1. Sign up with a new test account.
2. Log in and receive a JWT.
3. Submit an applicant risk check and confirm `risk_score`, `risk_band`, and `top_factors`.
4. Run a stress test with rate and inflation shocks.
5. Confirm the report appears in history.
6. Delete test data from MongoDB Atlas after validation.

## Known Risks Before Production

- The current fallback mode is useful for development but stores users and reports only in process memory.
- The notebook currently trains on the full encoded dataset before validation; production model governance should add a leakage review, versioned split, calibration, and monitoring.
- Mobile builds read `EXPO_PUBLIC_API_URL`; provide the deployed Node API URL per environment.
- Do not use demo fallback scores for lending decisions.
