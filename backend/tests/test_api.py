import io
import csv
import pytest
from backend.api import _extract_meta_features, _detect_category_hints, _clean_text


def test_predict_valid_text(client, sample_real_text):
    resp = client.post("/api/predict", json={
        "text": sample_real_text,
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["label"] in ("real", "fake")
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["model_used"] == "Hybrid Random Forest"
    assert data["threshold"] == 0.5


def test_predict_with_explain(client, sample_real_text):
    resp = client.post("/api/predict?explain=true", json={
        "text": sample_real_text,
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "word_contributions" in data
    assert "category_hints" in data
    assert "meta_indicators" in data


def test_predict_empty_text(client):
    resp = client.post("/api/predict", json={
        "text": "",
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 422


def test_predict_no_usable_words(client):
    resp = client.post("/api/predict", json={
        "text": "!!! ??? 123 ***",
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 400
    assert "no usable words" in resp.json()["detail"].lower()


def test_predict_invalid_model(client, sample_real_text):
    resp = client.post("/api/predict", json={
        "text": sample_real_text,
        "model": "invalid_model",
        "threshold": 0.5,
    })
    assert resp.status_code == 422


def test_predict_threshold_below_zero(client, sample_real_text):
    resp = client.post("/api/predict", json={
        "text": sample_real_text,
        "model": "hybrid",
        "threshold": -0.1,
    })
    assert resp.status_code == 422


def test_predict_threshold_above_one(client, sample_real_text):
    resp = client.post("/api/predict", json={
        "text": sample_real_text,
        "model": "hybrid",
        "threshold": 1.5,
    })
    assert resp.status_code == 422


def test_predict_all_three_models(client, sample_real_text):
    resp = client.post("/api/predict-all", json={
        "text": sample_real_text,
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 3
    model_keys = {r["model"] for r in data["results"]}
    assert model_keys == {"logistic", "rf", "hybrid"}


def test_predict_all_models_return_display_names(client, sample_real_text):
    resp = client.post("/api/predict-all", json={
        "text": sample_real_text,
        "model": "hybrid",
        "threshold": 0.5,
    })
    data = resp.json()
    for r in data["results"]:
        assert r["label"] in ("real", "fake")
        assert 0.0 <= r["confidence"] <= 1.0
        assert r["model_used"]


def test_analyze_url_invalid_no_protocol(client):
    resp = client.post("/api/analyze-url", json={
        "url": "example.com",
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 422


def test_analyze_url_just_protocol(client):
    resp = client.post("/api/analyze-url", json={
        "url": "http://",
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 400


def test_predict_batch_valid_csv(client, sample_csv_bytes):
    resp = client.post(
        "/api/predict-batch?model=hybrid&threshold=0.5",
        files={"file": ("test.csv", sample_csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_rows" in data
    assert data["total_rows"] == 3
    assert len(data["results"]) == 3
    assert data["model_used"] == "Hybrid Random Forest"
    assert data["processing_time_ms"] > 0


def test_predict_batch_no_text_column_auto_detects(client, sample_csv_no_text_column):
    resp = client.post(
        "/api/predict-batch?model=hybrid&threshold=0.5",
        files={"file": ("test.csv", sample_csv_no_text_column, "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 2
    assert data["text_column_used"] == "id"


def test_predict_batch_explicit_text_column(client, sample_csv_no_text_column):
    resp = client.post(
        "/api/predict-batch?model=hybrid&threshold=0.5&text_column=content",
        files={"file": ("test.csv", sample_csv_no_text_column, "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 2
    assert data["text_column_used"] == "content"


def test_predict_batch_nonexistent_column(client, sample_csv_bytes):
    resp = client.post(
        "/api/predict-batch?model=hybrid&threshold=0.5&text_column=nonexistent",
        files={"file": ("test.csv", sample_csv_bytes, "text/csv")},
    )
    assert resp.status_code == 400


def test_predict_batch_over_row_limit(client, sample_csv_over_limit):
    resp = client.post(
        "/api/predict-batch?model=hybrid&threshold=0.5",
        files={"file": ("big.csv", sample_csv_over_limit, "text/csv")},
    )
    assert resp.status_code == 400
    assert "1000" in resp.json()["detail"]


def test_predict_batch_not_csv(client):
    resp = client.post(
        "/api/predict-batch?model=hybrid&threshold=0.5",
        files={"file": ("data.txt", b"hello,world", "text/plain")},
    )
    assert resp.status_code == 400
    assert "must be a csv" in resp.json()["detail"].lower()


def test_predict_batch_invalid_model(client, sample_csv_bytes):
    resp = client.post(
        "/api/predict-batch?model=invalid&threshold=0.5",
        files={"file": ("test.csv", sample_csv_bytes, "text/csv")},
    )
    assert resp.status_code == 400


def test_predict_batch_invalid_threshold(client, sample_csv_bytes):
    resp = client.post(
        "/api/predict-batch?model=hybrid&threshold=1.5",
        files={"file": ("test.csv", sample_csv_bytes, "text/csv")},
    )
    assert resp.status_code == 400


def test_list_models(client):
    resp = client.get("/api/models")
    assert resp.status_code == 200
    data = resp.json()
    assert "models" in data
    assert len(data["models"]) == 3


def test_feature_importances(client):
    resp = client.get("/api/feature-importances?model=hybrid")
    assert resp.status_code == 200
    data = resp.json()
    assert "features" in data
    assert len(data["features"]) > 0


def test_feature_importances_invalid_model(client):
    resp = client.get("/api/feature-importances?model=invalid")
    assert resp.status_code == 400


def test_accuracy_endpoint(client):
    resp = client.get("/api/accuracy")
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data


def test_roc_data_endpoint(client):
    resp = client.get("/api/roc-data")
    assert resp.status_code == 200


def test_class_distribution_endpoint(client):
    resp = client.get("/api/class-distribution")
    assert resp.status_code == 200
    data = resp.json()
    assert "labels" in data
    assert "counts" in data


def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_predict_real_text_with_logistic(client, sample_real_text):
    resp = client.post("/api/predict", json={
        "text": sample_real_text,
        "model": "logistic",
        "threshold": 0.5,
    })
    assert resp.status_code == 200
    assert resp.json()["model_used"] == "Logistic Regression"


def test_predict_real_text_with_rf(client, sample_real_text):
    resp = client.post("/api/predict", json={
        "text": sample_real_text,
        "model": "rf",
        "threshold": 0.5,
    })
    assert resp.status_code == 200
    assert resp.json()["model_used"] == "Random Forest"


def test_predict_fake_text_flagged(client, sample_fake_text):
    resp = client.post("/api/predict", json={
        "text": sample_fake_text,
        "model": "hybrid",
        "threshold": 0.5,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["label"] == "fake"


def test_extract_meta_features():
    text = "Hello @user check http://x.com #trending"
    meta = _extract_meta_features(text)
    assert meta["link_count"] == 1
    assert meta["mention_count"] == 1
    assert meta["hashtag_count"] == 1
    assert meta["word_count"] == 5
    assert meta["avg_word_length"] > 0
    assert meta["char_entropy"] > 0
