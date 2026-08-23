from pathlib import Path
import pickle
import os
import tempfile
import urllib.request
import urllib.error
import zipfile
from typing import Any
import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
ARTIFACT_DIR = Path(os.getenv('MODEL_ARTIFACT_DIR', ROOT))
app = FastAPI(title='AI Risk Manager ML API', version='1.0.0')

class Applicant(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)

class StressRequest(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)
    rate_hike_pct: float = Field(ge=0, le=25, default=2)
    inflation_pct: float = Field(ge=0, le=25, default=0)

def engineer(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    income = pd.to_numeric(frame.get('AMT_INCOME_TOTAL', 0), errors='coerce').replace(0, np.nan)
    credit = pd.to_numeric(frame.get('AMT_CREDIT', 0), errors='coerce')
    annuity = pd.to_numeric(frame.get('AMT_ANNUITY', 0), errors='coerce').replace(0, np.nan)
    frame['DEBT_TO_INCOME'] = credit / income
    frame['CREDIT_TO_ANNUITY'] = credit / annuity
    frame['AGE_YEARS'] = -pd.to_numeric(frame.get('DAYS_BIRTH', 0), errors='coerce') / 365.25
    frame['EMPLOYMENT_YEARS'] = pd.to_numeric(frame.get('DAYS_EMPLOYED', 0), errors='coerce').clip(upper=0).abs() / 365.25
    return frame.replace([np.inf, -np.inf], np.nan)

def load_artifacts():
    archive_url = os.getenv('MODEL_ARTIFACT_URL')
    if archive_url:
        artifact_dir = Path(tempfile.gettempdir()) / 'atlas-risk-model'
        artifact_dir.mkdir(exist_ok=True)
        archive_path = artifact_dir / 'model-artifacts.zip'
        if not archive_path.exists():
            urllib.request.urlretrieve(archive_url, archive_path)
            with zipfile.ZipFile(archive_path) as archive:
                archive.extractall(artifact_dir)
        artifact_root = artifact_dir
    else:
        artifact_root = ARTIFACT_DIR
    try:
        with open(artifact_root / 'risk_model.pkl', 'rb') as f: model = pickle.load(f)
        with open(artifact_root / 'shap_explainer.pkl', 'rb') as f: explainer = pickle.load(f)
        with open(artifact_root / 'preprocessor.pkl', 'rb') as f: bundle = pickle.load(f)
        return model, explainer, bundle['transformer']
    except (FileNotFoundError, urllib.error.URLError, zipfile.BadZipFile):
        return None, None, None

model, explainer, preprocessor = load_artifacts()

def predict(data: dict[str, Any], rate_hike_pct: float = 0, inflation_pct: float = 0):
    adjusted = dict(data)
    if rate_hike_pct:
        adjusted['AMT_ANNUITY'] = float(adjusted.get('AMT_ANNUITY', 0) or 0) * (1 + (rate_hike_pct + inflation_pct * 0.35) / 100)
    if model is None:
        income = max(float(adjusted.get('AMT_INCOME_TOTAL', 1) or 1), 1)
        credit = float(adjusted.get('AMT_CREDIT', 0) or 0)
        score = min(0.95, max(0.04, 0.12 + credit / income * 0.08 + rate_hike_pct * 0.025 + inflation_pct * 0.009))
        factors = [{'feature': 'Debt-to-income ratio', 'impact': round(credit / income, 3)}, {'feature': 'Rate shock', 'impact': round(rate_hike_pct / 10, 3)}, {'feature': 'Inflation shock', 'impact': round(inflation_pct / 10, 3)}]
    else:
        values = preprocessor.transform(engineer(pd.DataFrame([adjusted])))
        score = float(model.predict_proba(values)[:, 1][0])
        shap_values = explainer.shap_values(values)
        impacts = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]
        names = preprocessor.get_feature_names_out()
        ranked = np.argsort(np.abs(impacts))[::-1][:5]
        factors = [{'feature': str(names[i]).replace('num__', '').replace('cat__', ''), 'impact': round(float(impacts[i]), 4)} for i in ranked]
    return {'risk_score': round(score, 4), 'risk_band': 'High' if score >= 0.5 else 'Low', 'top_factors': factors}

@app.get('/health')
def health(): return {'status': 'ok', 'model_loaded': model is not None, 'demo_mode': model is None}

@app.post('/predict')
def predict_endpoint(request: Applicant): return predict(request.data)

@app.post('/stress-test')
def stress_endpoint(request: StressRequest): return predict(request.data, request.rate_hike_pct, request.inflation_pct)
