import json
import numpy as np
import pandas as pd
import joblib

from backend.config import MODEL_DIR, PROCESSED_DIR, OUTPUTS_DIR, MODEL_REGISTRY, META_FEATURE_NAMES


# Lazy singleton: loads models and artifacts on first request, keeps them cached after that.
class ModelLoader:
    _instance = None

    # Classic singleton — one instance serves the whole app.
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._models = {}
        self._vectorizer = None
        self._selector = None
        self._scaler = None
        self._class_distribution = None
        self._accuracy_data = None
        self._roc_data = None

    # Load a model by key (logistic / rf / hybrid) — cached after first load.
    def get_model(self, name):
        if name not in self._models:
            info = MODEL_REGISTRY[name]
            self._models[name] = joblib.load(info["path"])
        return self._models[name]

    # Load or return cached TF-IDF vectorizer.
    def get_vectorizer(self):
        if self._vectorizer is None:
            self._vectorizer = joblib.load(PROCESSED_DIR / "vectorizer.pkl")
        return self._vectorizer

    # Load or return cached feature selector for the hybrid pipeline.
    def get_selector(self):
        if self._selector is None:
            self._selector = joblib.load(MODEL_DIR / "selector.pkl")
        return self._selector

    # Load or return cached meta-feature scaler.
    def get_scaler(self):
        if self._scaler is None:
            self._scaler = joblib.load(PROCESSED_DIR / "scaler.pkl")
        return self._scaler

    # Load and parse evaluation metrics from the JSON file, keyed by model + test set.
    def get_accuracy_data(self):
        if self._accuracy_data is None:
            path = OUTPUTS_DIR / "evaluation_metrics.json"
            with open(path) as f:
                raw = json.load(f)
            results = []
            for key, metrics in raw.items():
                parts = key.split(" on ")
                results.append({
                    "model": parts[0],
                    "test_set": parts[1] if len(parts) > 1 else "unknown",
                    **metrics,
                })
            self._accuracy_data = results
        return self._accuracy_data

    # Load or return cached ROC curve data for all models.
    def get_roc_data(self):
        if self._roc_data is None:
            path = OUTPUTS_DIR / "roc_data.json"
            with open(path) as f:
                self._roc_data = json.load(f)
        return self._roc_data

    # Read the training labels and count how many real vs. fake samples there are.
    def get_class_distribution(self):
        if self._class_distribution is None:
            df = pd.read_csv(PROCESSED_DIR / "processed_train.csv")
            counts = df["label"].value_counts()
            label_map = {0: "real", 1: "fake"}
            labels = [label_map.get(int(k), str(k)) for k in counts.index]
            self._class_distribution = {
                "labels": labels,
                "counts": counts.values.tolist(),
            }
        return self._class_distribution

    # Pull feature names from the vectorizer, handling the sklearn API change between versions.
    def _get_feature_names_vectorizer(self):
        vec = self.get_vectorizer()
        try:
            return vec.get_feature_names_out().tolist()
        except AttributeError:
            return vec.get_feature_names().tolist()

    # Return the top-N most influential features with their importance scores.
    def get_feature_importances(self, model_name, top_n=10):
        model = self.get_model(model_name)
        info = MODEL_REGISTRY[model_name]

        if model_name == "logistic":
            importances = np.abs(model.coef_[0])
        else:
            importances = model.feature_importances_

        if model_name == "hybrid":
            selector = self.get_selector()
            try:
                selected = selector.get_feature_names_out(self._get_feature_names_vectorizer())
            except AttributeError:
                mask = selector.get_support()
                all_names = np.array(self._get_feature_names_vectorizer())
                selected = all_names[mask]
            feature_names = list(selected) + META_FEATURE_NAMES
        else:
            feature_names = self._get_feature_names_vectorizer()

        indices = np.argsort(importances)[::-1][:top_n]
        return [
            {"name": str(feature_names[i]), "importance": float(importances[i])}
            for i in indices
        ]
