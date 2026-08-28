from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR.parent / "Model"
PROCESSED_DIR = BASE_DIR / "Processed"
OUTPUTS_DIR = BASE_DIR / "Outputs"

# Maps model keys to their file paths, display names, and pipeline config.
MODEL_REGISTRY = {
    "logistic": {
        "path": MODEL_DIR / "logistic_model.pkl",
        "display": "Logistic Regression",
        "pipeline": "tfidf_only",
        "n_features": 5000,
    },
    "rf": {
        "path": MODEL_DIR / "random_forest_model.pkl",
        "display": "Random Forest",
        "pipeline": "tfidf_only",
        "n_features": 5000,
    },
    "hybrid": {
        "path": MODEL_DIR / "random_forest_hybrid_model.pkl",
        "display": "Hybrid Random Forest",
        "pipeline": "hybrid",
        "n_features": 2006,
    },
}

# Names of the structural features the hybrid pipeline extracts alongside TF-IDF.
META_FEATURE_NAMES = [
    "link_count",
    "mention_count",
    "hashtag_count",
    "word_count",
    "avg_word_length",
    "char_entropy",
]

# Hard limits: at most 1000 rows or 5 MB per CSV upload.
MAX_BATCH_SIZE = 1000
MAX_BATCH_MB = 5
