import io
import re
import time
import httpx
import numpy as np
import pandas as pd
from collections import Counter
from bs4 import BeautifulSoup
from scipy.stats import entropy
from fastapi import APIRouter, HTTPException, Query, UploadFile, File

from backend.schemas import PredictRequest, UrlPredictRequest, PredictResponse, SingleModelResult, AllPredictionsResponse, WordContribution, CategoryHint, MetaIndicator
from backend.model_loader import ModelLoader
from backend.config import MODEL_REGISTRY, META_FEATURE_NAMES, MAX_BATCH_SIZE, MAX_BATCH_MB

router = APIRouter(prefix="/api")


# Lowercase everything, strip URLs/mentions/hashtags/non-alpha — clean in, clean out.
def _clean_text(text):
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"@\w+|#\w+", "", text)
    text = re.sub(r"[^a-z\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# Pull structural signals: links, mentions, hashtags, word stats, and character entropy.
def _extract_meta_features(text):
    text = str(text)
    features = {}
    features["link_count"] = len(re.findall(r"http\S+|www\S+", text))
    features["mention_count"] = len(re.findall(r"@\w+", text))
    features["hashtag_count"] = len(re.findall(r"#\w+", text))
    words = text.split()
    features["word_count"] = len(words)
    features["avg_word_length"] = np.mean([len(w) for w in words]) if words else 0
    counts = Counter(text)
    probs = [c / len(text) for c in counts.values()] if text else []
    features["char_entropy"] = entropy(probs, base=2) if probs else 0
    return features


# Each rule checks a meta feature and returns a human-readable flag if it looks suspicious.
META_INDICATOR_RULES = [
    ("link_count", lambda v: v > 0, "Contains {} link(s) to external sources"),
    ("mention_count", lambda v: v > 2, "Uses {} mentions (@user) — potential coordinated behaviour"),
    ("hashtag_count", lambda v: v > 2, "Uses {} hashtags — trending topic manipulation"),
    ("word_count", lambda v: v < 5, "Very short text ({})"),
    ("avg_word_length", lambda v: v > 10, "Unusually long words (avg {} chars) — obfuscation attempt"),
    ("char_entropy", lambda v: v < 3.0, "Low character diversity ({:.1f}) — repetitive patterns"),
]

# Keyword lists for classifying text into misinformation archetypes.
CATEGORY_PATTERNS = {
    "Urgency / Scarcity": [
        "urgent", "limited", "hurry", "act now", "last chance",
        "don't wait", "expires", "only today",
        "breaking", "just in", "now", "immediately", "alert", "critical",
    ],
    "Emotional Manipulation": [
        "shocking", "unbelievable", "outrage", "heartbreaking",
        "you won't believe", "jaw-dropping", "mind-blowing",
        "mind blown", "shock", "unreal", "can't believe", "insane",
        "wild", "epic", "hooked",
    ],
    "Conspiracy Language": [
        "hidden truth", "cover up", "they don't want you",
        "what they don't tell", "secret", "exposed",
        "they don't want", "insider", "leaked", "secretly",
        "hidden", "sources say", "allegedly",
    ],
    "Financial Scam": [
        "free money", "guaranteed", "win big", "click here",
        "congratulations", "you've won",
        "purchase", "buy now", "exclusive offer", "limited supply",
    ],
    "Health Misinformation": [
        "miracle cure", "doctors hate", "big pharma",
        "natural remedy", "detox", "cure",
        "miracle", "life-changing", "doctors recommend", "natural",
    ],
}


# Match text against known misinformation categories and return what it triggered.
def _detect_category_hints(text):
    text_lower = str(text).lower()
    hints = []
    for category, keywords in CATEGORY_PATTERNS.items():
        matches = [kw for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text_lower)]
        if matches:
            hints.append(CategoryHint(category=category, matched_words=matches, count=len(matches)))
    return hints


# Figure out which words (and meta features) drove the prediction — used for explainability.
def _get_word_contributions(text, model_name):
    loader = ModelLoader()
    cleaned = _clean_text(text)
    if not cleaned.strip():
        return []

    vec = loader.get_vectorizer()
    model = loader.get_model(model_name)
    info = MODEL_REGISTRY[model_name]

    if info["pipeline"] == "hybrid":
        selector = loader.get_selector()
        scaler = loader.get_scaler()
        tfidf = vec.transform([cleaned])
        selected_mask = selector.get_support()
        original_indices = np.where(selected_mask)[0]
        tfidf_2000 = selector.transform(tfidf).toarray()
        meta = _extract_meta_features(text)
        meta_df = pd.DataFrame([meta], columns=META_FEATURE_NAMES)
        meta_scaled = scaler.transform(meta_df)
        features = np.hstack([tfidf_2000, meta_scaled])

        n_tfidf_sel = tfidf_2000.shape[1]
        baseline_proba = model.predict_proba(features)[0][1]
        all_feature_names = vec.get_feature_names_out()

        contributions = []
        non_zero = np.where(tfidf_2000[0] > 0)[0]
        # Sort by TF-IDF weight descending and cap at 30 — perturbation is O(n × trees)
        # and the Comparison page calls all 3 models with explain=True, risking timeout.
        if len(non_zero) > 30:
            top_idx = np.argsort(tfidf_2000[0, non_zero])[::-1][:30]
            non_zero = non_zero[top_idx]
        for idx in non_zero:
            modified = features.copy()
            modified[0, idx] = 0.0
            new_proba = model.predict_proba(modified)[0][1]
            diff = baseline_proba - new_proba
            word = str(all_feature_names[original_indices[idx]])
            contributions.append(WordContribution(
                word=word,
                contribution=round(abs(diff), 4),
                direction="fake" if diff > 0 else "real",
            ))

        meta_indicators = []
        for field, rule, template in META_INDICATOR_RULES:
            val = meta[field]
            if rule(val):
                if isinstance(val, float):
                    desc = template.format(val)
                else:
                    desc = template.format(int(val))
                meta_indicators.append(MetaIndicator(name=field, value=float(val), description=desc))

        contributions.sort(key=lambda c: c.contribution, reverse=True)
        return contributions[:15], meta_indicators
    else:
        tfidf = vec.transform([cleaned])
        features = tfidf
        baseline_proba = model.predict_proba(features)[0][1]
        all_feature_names = vec.get_feature_names_out()

        if model_name == "logistic":
            weights = model.coef_[0]
        else:
            weights = model.feature_importances_

        contributions = []
        if hasattr(features, "toarray"):
            dense = features.toarray()[0]
        else:
            dense = features[0]

        non_zero = np.where(dense > 0)[0]
        # Cap perturbation iterations for tree models — same reason as the hybrid branch.
        if model_name != "logistic" and len(non_zero) > 30:
            top_idx = np.argsort(dense[non_zero])[::-1][:30]
            non_zero = non_zero[top_idx]
        for idx in non_zero:
            tfidf_val = dense[idx]
            weight = weights[idx] if idx < len(weights) else 0
            if model_name == "logistic":
                contrib_val = abs(tfidf_val * weight)
                direction = "fake" if weight > 0 else "real"
            else:
                modified = features.toarray().copy()
                modified[0, idx] = 0.0
                new_proba = model.predict_proba(modified)[0][1]
                diff = baseline_proba - new_proba
                contrib_val = abs(diff)
                direction = "fake" if diff > 0 else "real"

            word = str(all_feature_names[idx])
            contributions.append(WordContribution(
                word=word,
                contribution=round(contrib_val, 4),
                direction=direction,
            ))

        contributions.sort(key=lambda c: c.contribution, reverse=True)
        return contributions[:15], []


# Core prediction logic: clean text, vectorize, run through a model, return label + confidence.
def _run_prediction(text, model_name, threshold, explain=False):
    loader = ModelLoader()
    cleaned = _clean_text(text)
    if not cleaned.strip():
        raise HTTPException(
            status_code=400,
            detail="Input text contains no usable words after cleaning.",
        )

    vec = loader.get_vectorizer()
    model = loader.get_model(model_name)
    info = MODEL_REGISTRY[model_name]

    if info["pipeline"] == "hybrid":
        selector = loader.get_selector()
        scaler = loader.get_scaler()

        tfidf = vec.transform([cleaned])
        tfidf_2000 = selector.transform(tfidf).toarray()

        meta = _extract_meta_features(text)
        meta_df = pd.DataFrame(
            [meta],
            columns=META_FEATURE_NAMES,
        )
        meta_scaled = scaler.transform(meta_df)
        features = np.hstack([tfidf_2000, meta_scaled])
    else:
        tfidf = vec.transform([cleaned])
        features = tfidf

    proba = model.predict_proba(features)[0]
    pred = 1 if proba[1] >= threshold else 0
    confidence = proba[1] if pred == 1 else proba[0]

    result = {
        "label": "fake" if pred == 1 else "real",
        "confidence": float(confidence),
    }

    if explain:
        word_contrib, meta_indicators = _get_word_contributions(text, model_name)
        result["word_contributions"] = [c.model_dump() for c in word_contrib]
        result["meta_indicators"] = [m.model_dump() for m in meta_indicators]

        category_hints = _detect_category_hints(text)
        result["category_hints"] = [h.model_dump() for h in category_hints]

    return result


# Safe wrapper — catches errors so one bad row in a batch doesn't kill the whole request.
def _run_prediction_safe(text, model_name, threshold, explain=False):
    try:
        result = _run_prediction(text, model_name, threshold, explain=explain)
        out = {
            "label": result["label"],
            "confidence": result["confidence"],
        }
        if explain:
            out["word_contributions"] = result.get("word_contributions", [])
            out["category_hints"] = result.get("category_hints", [])
            out["meta_indicators"] = result.get("meta_indicators", [])
        return out
    except HTTPException as e:
        return {"label": "error", "confidence": 0.0, "reason": e.detail}
    except Exception as e:
        return {"label": "error", "confidence": 0.0, "reason": str(e)}


# Predict a single text with one model. Optionally include word-level explanations.
@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, explain: bool = Query(False)):
    result = _run_prediction(req.text, req.model, req.threshold, explain=explain)
    return PredictResponse(
        label=result["label"],
        confidence=result["confidence"],
        model_used=MODEL_REGISTRY[req.model]["display"],
        threshold=req.threshold,
        word_contributions=result.get("word_contributions"),
        category_hints=result.get("category_hints"),
        meta_indicators=result.get("meta_indicators"),
    )


# Fetch a URL, scrape the readable text, then run the model on it — returns everything.
@router.post("/analyze-url")
async def analyze_url(req: UrlPredictRequest):
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(
                req.url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            )
            resp.raise_for_status()
            html = resp.text
    except httpx.TimeoutException:
        raise HTTPException(status_code=400, detail="Request to URL timed out after 30 seconds.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"URL returned status {e.response.status_code}.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {str(e)[:100]}")

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    article = soup.find("article")
    if article:
        text = article.get_text(separator=" ", strip=True)
    else:
        main = soup.find("main")
        if main:
            text = main.get_text(separator=" ", strip=True)
        else:
            text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r'\s+', ' ', text).strip()

    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="No usable text content found at the URL (need at least 50 characters).")

    text = text[:10000]
    result = _run_prediction(text, req.model, req.threshold, explain=True)
    return PredictResponse(
        label=result["label"],
        confidence=result["confidence"],
        model_used=MODEL_REGISTRY[req.model]["display"],
        threshold=req.threshold,
        fetched_text=text,
        word_contributions=result.get("word_contributions"),
        category_hints=result.get("category_hints"),
        meta_indicators=result.get("meta_indicators"),
    )


# Run the same text through all three models and return side-by-side results.
@router.post("/predict-all", response_model=AllPredictionsResponse)
def predict_all(req: PredictRequest):
    model_names = ["logistic", "rf", "hybrid"]
    results = []
    for model_name in model_names:
        result = _run_prediction(req.text, model_name, req.threshold, explain=True)
        results.append(SingleModelResult(
            model=model_name,
            label=result["label"],
            confidence=result["confidence"],
            model_used=MODEL_REGISTRY[model_name]["display"],
            word_contributions=result.get("word_contributions"),
            category_hints=result.get("category_hints"),
            meta_indicators=result.get("meta_indicators"),
        ))
    return AllPredictionsResponse(text=req.text, threshold=req.threshold, results=results)


VALID_MODELS = {"logistic", "rf", "hybrid"}

# Upload a CSV of texts, get predictions back. Handles validation, batching, and optional explanations.
@router.post("/predict-batch")
async def predict_batch(
    file: UploadFile = File(...),
    model: str = Query("hybrid"),
    threshold: float = Query(0.5),
    text_column: str = Query(None, description="Name of the column containing text. Auto-detected if omitted."),
    explain: bool = Query(False, description="Include per-row word explanations (slower)"),
):
    if model not in VALID_MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model '{model}'. Choose from: {', '.join(sorted(VALID_MODELS))}.")
    if not (0.0 <= threshold <= 1.0):
        raise HTTPException(status_code=400, detail="Threshold must be between 0 and 1.")
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV.")

    contents = await file.read()
    if len(contents) > MAX_BATCH_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {MAX_BATCH_MB} MB.",
        )

    try:
        df = pd.read_csv(io.BytesIO(contents), on_bad_lines="skip", engine="python")
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV is empty or had no valid rows to parse.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse CSV file: {str(e)[:100]}. Ensure it has a header row and consistent columns.",
        )

    if text_column:
        if text_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Column '{text_column}' not found. Available columns: {', '.join(df.columns)}.",
            )
        text_col = text_column
    else:
        text_col = "text" if "text" in df.columns else df.columns[0]

    if df[text_col].dropna().empty:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{text_col}' has no text data after removing empty rows.",
        )

    if len(df) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"CSV exceeds maximum of {MAX_BATCH_SIZE} rows.",
        )

    start_time = time.time()
    results = []
    for i, row in df.iterrows():
        raw_text = str(row[text_col]) if pd.notna(row[text_col]) else ""
        pred = _run_prediction_safe(raw_text, model, threshold, explain=explain)
        out = {
            "index": i,
            "text": raw_text[:200],
            "label": pred["label"],
            "confidence": pred["confidence"],
        }
        if "reason" in pred:
            out["reason"] = pred["reason"]
        if explain:
            out["word_contributions"] = pred.get("word_contributions", [])
            out["category_hints"] = pred.get("category_hints", [])
            out["meta_indicators"] = pred.get("meta_indicators", [])
        results.append(out)

    processing_time = time.time() - start_time
    resp = {
        "model_used": MODEL_REGISTRY[model]["display"],
        "threshold": threshold,
        "total_rows": len(results),
        "columns": list(df.columns),
        "text_column_used": text_col,
        "processing_time_ms": round(processing_time * 1000, 1),
        "results": results,
    }
    return resp


# List available models with display names, pipeline info, and friendly descriptions.
@router.get("/models")
def list_models():
    MODEL_TAGS = {
        "logistic": {
            "tags": ["Fast", "Efficient"],
            "strength": "Speed",
            "description": "Simple linear model — fastest predictions with solid 97% external accuracy.",
        },
        "rf": {
            "tags": ["Balanced", "High AUC"],
            "strength": "Balance",
            "description": "Tree-based ensemble — great balance of speed and accuracy with the best AUC score.",
        },
        "hybrid": {
            "tags": ["Most Accurate", "Deep Analysis"],
            "strength": "Accuracy",
            "description": "Adds structural text analysis (links, mentions, etc.) — best overall accuracy at 98.7%.",
        },
    }
    return {
        "models": [
            {
                "key": key,
                "display": info["display"],
                "pipeline": info["pipeline"],
                **MODEL_TAGS.get(key, {"tags": [], "strength": "General", "description": ""}),
            }
            for key, info in MODEL_REGISTRY.items()
        ]
    }


# Return the top-N features for a given model, ranked by importance.
@router.get("/feature-importances")
def feature_importances(model: str = Query("hybrid")):
    if model not in VALID_MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model}")
    loader = ModelLoader()
    features = loader.get_feature_importances(model)
    return {"features": features, "model": MODEL_REGISTRY[model]["display"]}


# Accuracy, precision, recall, F1 — per model and per test set.
@router.get("/accuracy")
def accuracy():
    loader = ModelLoader()
    return {"results": loader.get_accuracy_data()}


# ROC curve data points — used by the frontend to draw the chart.
@router.get("/roc-data")
def roc_data():
    loader = ModelLoader()
    return loader.get_roc_data()


# How many real vs. fake samples the model was trained on.
@router.get("/class-distribution")
def class_distribution():
    loader = ModelLoader()
    return loader.get_class_distribution()
