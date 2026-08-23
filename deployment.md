# Production Deployment

```text
GitHub Pages (web/) -> Vercel (node-backend/) -> Hugging Face Space (ml-backend/) -> MongoDB Atlas
```

## MongoDB Atlas

Create a database user and database, allow the deployed Vercel IP range (or `0.0.0.0/0` with a strong password), and copy the SRV connection string. Do not commit it.

## Hugging Face FastAPI

Create a Docker Space from this repository and set its root directory to `ml-backend`. The included Dockerfile listens on Hugging Face's port `7860`.

Add `MODEL_ARTIFACT_URL` as a Space secret if production model artifacts are stored in a private ZIP. Confirm `<space-url>/health` returns `model_loaded: true` before using real lending decisions. Demo mode is only for development.

## Vercel Node API

Import the repository into Vercel and set the project root directory to `node-backend`. The included `vercel.json` maps every request to the Express serverless function.

Set these Vercel Production variables:

- `MONGO_URI`: MongoDB Atlas SRV connection string
- `JWT_SECRET`: long random secret
- `ML_URL`: Hugging Face Space URL, for example `https://my-risk-model.hf.space`
- `CORS_ORIGIN`: `https://arvindkumar4545.github.io`

Verify `https://<vercel-project>.vercel.app/health` reports `database: mongodb`.

For optional GitHub Actions deployment, add repository secret `VERCEL_TOKEN`. Vercel's Git integration is otherwise sufficient.

## GitHub Pages

In repository Settings -> Pages, select GitHub Actions. Add Actions variable `VITE_API_URL` containing the Vercel URL, without a trailing slash. The existing Pages workflow builds `web/` and publishes `https://arvindkumar4545.github.io/AI-RISK-MANAGER/`.

The frontend calls Vercel routes such as `/api/auth/login`; Vercel calls the Hugging Face `/predict` and `/stress-test` routes, and only Vercel connects to MongoDB Atlas.

## Verification

```powershell
curl.exe -s https://<hugging-face-space>.hf.space/health
curl.exe -s https://<vercel-project>.vercel.app/health
curl.exe -s -o NUL -w "%{http_code}" https://arvindkumar4545.github.io/AI-RISK-MANAGER/
```
