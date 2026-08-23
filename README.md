# Atlas Risk Manager

Full-stack explainable credit-risk platform built around the Home Credit Default Risk dataset.

## Architecture

- `train_model.ipynb`: feature engineering, SMOTE balancing, LightGBM training, ROC-AUC/classification report, and SHAP artifacts.
- `ml-backend/`: FastAPI inference service on port `8000`.
- `node-backend/`: Express + MongoDB auth and report API on port `4000`.
- `web/`: React/Vite analyst workspace.
- `mobile/`: React Native/Expo companion app.
- `deployment.md`: GitHub Pages, Vercel, Hugging Face, and MongoDB Atlas deployment map.
- `.github/workflows/deploy-vercel.yml`: optional automatic Vercel API deployment on `main` changes.
- `DEPLOYMENT_AUDIT.md`: GitHub Pages, Vercel, Hugging Face, MongoDB Atlas, and UptimeRobot deployment checklist.
- `monitoring/uptimerobot-monitors.json`: monitor definitions to recreate in UptimeRobot.

## Setup

1. Download `application_train.csv` and `application_test.csv` from Kaggle and place them in `data/`.
2. Create a Python environment and install `requirements.txt`.
3. Run all cells in `train_model.ipynb` from the repository root. This writes `risk_model.pkl`, `shap_explainer.pkl`, and `preprocessor.pkl` to the root.
4. Start FastAPI from `ml-backend`: `uvicorn main:app --reload --port 8000`.
5. Start MongoDB, copy `node-backend/.env.example` to `node-backend/.env`, then run `npm install` and `npm run dev` in `node-backend`.
6. Run `npm install` and `npm run dev` in `web`, then open the Vite URL.

The ML service returns a deterministic demo score when the pickle artifacts are not present, allowing the UI and service contracts to be exercised before the Kaggle download. Production scoring requires running the notebook first.

For production scoring, upload a private ZIP containing `risk_model.pkl`, `shap_explainer.pkl`, and `preprocessor.pkl` to the Hugging Face ML service. The ML health response must report `model_loaded: true` before production use.

GitHub Pages deploys automatically from `main`. Connect `node-backend` as a Vercel project with its root directory set to `node-backend`; Vercel uses `vercel.json` to expose the Express API. Hugging Face Spaces can deploy `ml-backend` from this repository using its Dockerfile.

If MongoDB is unavailable, the Node API starts in temporary in-memory development mode so local signup, prediction, and history still work. Reports are lost when that process stops; start MongoDB and restart Node for durable storage.

## Production deployment (Railway + GitHub Pages)

Use the following exact values for production hosting.

### ML service

Service root: `ml-backend`

Required environment variables:

- `MODEL_ARTIFACT_URL` = leave blank for demo mode, or provide a private ZIP URL containing `risk_model.pkl`, `shap_explainer.pkl`, and `preprocessor.pkl`

Health check:

- `https://<ml-service>.up.railway.app/health`
- Expected response includes `status: "ok"` and either `model_loaded: true` or `demo_mode: true`

### API service

Service root: `node-backend`

Required environment variables:

- `MONGO_URI` = MongoDB Atlas SRV connection string
- `JWT_SECRET` = long random secret used for login tokens
- `ML_URL` = `https://<ml-service>.up.railway.app`
- `CORS_ORIGIN` = `https://arvindkumar4545.github.io`
- `PORT` = `4000`

Health check:

- `https://<api-service>.up.railway.app/health`
- Expected response includes `status: "ok"` and `database: "mongodb"` in production

### Frontend Pages

Repository variable for GitHub Actions:

- `VITE_API_URL` = `https://<api-service>.up.railway.app`

The workflow in `.github/workflows/deploy-web.yml` builds the Vite app and publishes to GitHub Pages at `https://arvindkumar4545.github.io/AI-RISK-MANAGER/`.

## API contracts

- `POST /predict`: `{ "data": { ...applicant fields } }`
- `POST /stress-test`: `{ "data": { ...applicant fields }, "rate_hike_pct": 4 }`
- Both return `risk_score`, `risk_band`, and `top_factors`.
- Node protected routes use `Authorization: Bearer <jwt>`.

## Mobile

Run `npm install` and `npm start` in `mobile`. For an emulator or physical device, set `EXPO_PUBLIC_API_URL` to a host reachable from that device instead of `localhost`.