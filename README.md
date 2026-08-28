# Misinformation Detection on Social Media

Full-stack web application for detecting misinformation in social media text using ensemble machine learning models. Built for COS30049 Assignment 3.

## Contributors

| Name | Student ID | Role |
|------|-----------|------|
| Chen Yong Hao | 106214496 | Data Engineer |
| Koh Boon Heok | 106213833 | Project Manager |
| Lee Ren Qi | 105971567 | Frontend Developer |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Material-UI 9, D3.js 7, Axios, React Router, Framer Motion, html2canvas, jspdf, react-transition-group |
| Backend | FastAPI, scikit-learn, Python 3.13+, httpx 0.27, beautifulsoup4 4.12 |
| ML Models | Logistic Regression, Random Forest, Hybrid Random Forest |

## Folder Structure

```
Assignment3/
├── launch.py                      # Unified launcher: starts FastAPI (port 8000) + React (port 3000)
├── Model/                         # Trained .pkl model files
│   ├── logistic_model.pkl
│   ├── random_forest_model.pkl
│   ├── random_forest_hybrid_model.pkl
│   └── selector.pkl               # Chi2 feature selector (5000 → 2000 features)
│
├── backend/                       # FastAPI Python backend
│   ├── main.py                    # FastAPI app initialisation + CORS config + /api/health
│   ├── api.py                     # All 10 API endpoints
│   ├── config.py                  # MODEL_REGISTRY, path constants, batch limits
│   ├── model_loader.py            # Singleton ModelLoader — loads .pkl files at startup
│   ├── schemas.py                 # Pydantic v2 request/response models
│   ├── requirements.txt           # Python dependencies
│   │
│   └── tests/                     # Pytest test suite (56 tests)
│   │   ├── __init__.py
│   │   ├── conftest.py                # Shared fixtures, TestClient, sample data
│   │   ├── test_api.py                # 30 endpoint tests (predict, batch, models, etc.)
│   │   ├── test_clean_text.py         # 11 unit tests for _clean_text
│   │   └── test_category_detection.py # 10 unit tests for _detect_category_hints
│   │
│   ├── Processed/                 # Precomputed transformers and training data
│   │   ├── vectorizer.pkl         # Trained TF-IDF vectorizer
│   │   ├── scaler.pkl             # StandardScaler for 6 meta-features
│   │   └── processed_train.csv    # Training data (class distribution endpoint)
│   │
│   └── Outputs/                         # Precomputed evaluation data
│       ├── roc_data.json                # FPR/TPR/AUC for all models
│       └── evaluation_metrics.json      # Accuracy, precision, recall, F1
│
├── frontend/                      # React 19 + Material-UI 9 SPA
│   ├── package.json               # npm dependencies
│   ├── package-lock.json          # Exact dependency versions
│   ├── config-overrides.js        # react-app-rewired webpack override
│   │
│   ├── public/
│   │   ├── index.html             # HTML shell
│   │   ├── manifest.json          # PWA manifest
│   │   ├── robots.txt
│   │   └── favicon.ico
│   │
│   ├── src/
│       ├── index.js               # React DOM entry point
│       ├── index.css              # Global styles
│       ├── App.js                 # BrowserRouter, 7 routes, ThemeProvider
│       ├── App.css                # App-level styles
│       ├── ColorModeContext.js    # Dark/light theme toggle context
│       ├── theme.js               # MUI 9 light/dark theme
│       │
│       ├── __tests__/                # Jest test suite (35 tests)
│       │   ├── PredictPage.test.js   # 12 tests: tabs, validation, button states
│       │   └── ResultPage.test.js    # 23 tests: single/batch views, categories, charts
│       │
│       ├── api/
│       │   └── axiosInstance.js   # Shared Axios instance
│       │
│       ├── pages/                 # 7 page components
│       │   ├── HomePage.js
│       │   ├── PredictPage.js
│       │   ├── ResultPage.js
│       │   ├── ComparisonPage.js
│       │   ├── ChartsPage.js
│       │   ├── HistoryPage.js
│       │   └── AboutPage.js
│       │
│       └── components/            # 19 reusable components
│           ├── Layout.js
│           ├── AnimatedContainer.js
│           ├── GaugeChart.js
│           ├── HistoryChart.js
│           ├── ConfidenceDistributionChart.js
│           ├── ModelUsageChart.js
│           ├── AvgTimeChart.js
│           ├── PredictionTimelineChart.js
│           ├── BatchSummaryChart.js
│           ├── FeatureImportanceChart.js
│           ├── AccuracyComparisonChart.js
│           ├── ROCCurveChart.js
│           ├── ClassDistributionChart.js
│           ├── PredictionHistory.js
│           ├── WordExplanation.js
│           ├── BatchWordAnalysis.js
│           ├── DataExplorer.js
│           ├── ModelRecommendation.js
│           └── ExportCSVButton.js
│
│
│
└── README.md
```

## Prerequisites

- **Python 3.13+** with `pip`
- **Node.js 18+** with npm

> macOS/Linux users: replace `python` with `python3` and `pip` with `pip3` in commands below if `python` is not found on your system.   

## Setup Instructions

### Option A: Unified Runner (Recommended)

```bash
python -m venv venv
# Windows: venv\Scripts\activate  |  macOS/Linux: source venv/bin/activate
pip install -r backend/requirements.txt
python launch.py
```

This starts both backend (uvicorn on port 8000) and frontend (npm start on port 3000).

### Option B: Separate Terminals

**Backend:**
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate  |  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Run single prediction on input text |
| POST | `/api/predict-all` | Run all 3 models in one request (shared vectorization) |
| POST | `/api/predict-batch` | Run batch prediction on multiple texts |
| POST | `/api/analyze-url` | Fetch URL content and run prediction |
| GET | `/api/models` | List available models |
| GET | `/api/feature-importances` | Get top-10 feature importances |
| GET | `/api/accuracy` | Model accuracy, precision, recall, F1 on test set |
| GET | `/api/roc-data` | Precomputed ROC curves |
| GET | `/api/class-distribution` | Training class distribution |
| GET | `/api/health` | Health check |

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, action cards, feature slideshow, misinformation stories |
| `/predict` | Predict | 3 tabs: Text (type/paste), URL (auto-fetch content), Batch CSV (upload) |
| `/result` | Result | Prediction result with gauges, word-level analysis, category detection |
| `/comparison` | Comparison | Side-by-side comparison of all 3 models |
| `/statistics` | Statistics | 5 D3 charts with per-chart data table view |
| `/history` | History | Full prediction history with search, sort, filter, export |
| `/about` | About | Contributors, tech stack, page routes, dataset sources, model performance charts |

## Features

- **3 Prediction Modes**: Text input, URL content scraping, batch CSV upload
- **Model Selection**: Logistic Regression, Random Forest, Hybrid Random Forest
- **Confidence Threshold**: Adjustable slider (0-1)
- **Word-Level Analysis**: Per-word contribution breakdown with color-coded highlights
- **Category Detection**: Urgency, emotional manipulation, conspiracy language, financial scam, health misinformation
- **URL Analysis**: Fetches page content via httpx + BeautifulSoup, prioritizes `<article>`/`<main>` tags
- **Batch CSV**: Upload CSV, auto-detect text column, live progress tracking with per-row status
- **Model Comparison**: Side-by-side results from all 3 models with ensemble verdict
- **Interactive Charts**: 5 D3.js charts (donut, grouped bar, horizontal bar, lollipop, timeline with trend line)
- **Data Table View**: Per-chart raw data dialogs with CSV export
- **Prediction History**: Logged to localStorage with search, sortable columns, pagination, export (CSV/JSON)
- **PDF Export**: Download single/batch results as PDF via html2canvas + jspdf
- **Feedback**: Thumbs up/down per prediction (localStorage)
- **Unified Runner**: Single `python launch.py` starts both backend and frontend
- **Responsive Design**: Collapsible AppBar, mobile-friendly layout
- **Dark Mode**: Purple-teal gradient theme with light/dark toggle (persisted in localStorage)

## Advanced Features

- Multi-model ensemble prediction (`/predict-all`)
- URL content scraping and analysis
- Batch CSV prediction with progress tracking
- Per-chart data table views with CSV export
- Prediction history with search, sort, filter, pagination
- Model comparison page
- PDF export for results
- Interactive D3.js charts (5 types)
- Word-level contribution analysis
- Social media category detection
- Unified runner script
- Collapsible navigation bar

## Testing

### Backend (pytest — 56 tests)

```bash
python -m pytest backend/tests/ -v
```

Covers: text cleaning (`_clean_text`), category detection (`_detect_category_hints`), all 10 API endpoints including prediction, batch CSV, URL analysis, model listing, accuracy, ROC data. Uses equivalence partitioning, boundary value analysis, and decision table techniques.

### Frontend (Jest — 35 tests)

```bash
cd frontend
npx react-app-rewired test --watchAll=false
```

Covers: PredictPage tab switching, URL validation, button enabled/disabled states; ResultPage single/batch views, gauge chart rendering, all 5 category hints, analysis coverage, batch summary, Compare Models, export buttons.

### Test Design Techniques Applied

| Technique | Example |
|-----------|---------|
| Equivalence Partitioning | Empty text, valid text, cleanable-empty text, invalid model names, threshold bounds |
| Boundary Value Analysis | CSV rows (0/1/1000/1001), file size limits (4.9 MB / 5.1 MB), URL character minimum |
| Decision Table | Predict button enabled/disabled across 3 tabs × input state × loading state (9 combos) |
| State Transition | Navigation flows: Home → Predict → Result → Comparison, History → Result |
| Error Guessing | Double-click Predict, corrupt localStorage, network disconnect, rapid tab switching |

## Notes

- Backend models are loaded once at startup (singleton pattern)
- All API calls use a single Axios instance with timeout
- History persisted in `localStorage` (keys: `prediction_history`, `prediction_bookmarks`, `prediction_feedback`)
