from pydantic import BaseModel, Field, field_validator
from typing import Optional


# Incoming request: text to classify, which model to use, and a confidence threshold override.
class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Input text to classify")
    model: str = Field(default="hybrid")
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("model")
    @classmethod
    def validate_model(cls, v):
        allowed = {"logistic", "rf", "hybrid"}
        if v not in allowed:
            raise ValueError(f"Unknown model '{v}'. Choose from: {', '.join(sorted(allowed))}.")
        return v


# Request to fetch a URL and run the model on whatever readable text it finds.
class UrlPredictRequest(BaseModel):
    url: str = Field(..., description="URL to fetch and analyze")
    model: str = Field(default="hybrid")
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("model")
    @classmethod
    def validate_model(cls, v):
        allowed = {"logistic", "rf", "hybrid"}
        if v not in allowed:
            raise ValueError(f"Unknown model '{v}'. Choose from: {', '.join(sorted(allowed))}.")
        return v


# How much a single word pushed the prediction toward "fake" or "real".
class WordContribution(BaseModel):
    word: str
    contribution: float
    direction: str


# One misinformation category matched in the text, with the specific trigger words.
class CategoryHint(BaseModel):
    category: str
    matched_words: list[str]
    count: int


# A structural red flag — too many links, hashtags, very short text, etc.
class MetaIndicator(BaseModel):
    name: str
    value: float
    description: str


# Full single-model response — label, confidence, and optional explanations.
class PredictResponse(BaseModel):
    label: str
    confidence: float
    model_used: str
    threshold: float
    word_contributions: Optional[list[WordContribution]] = None
    category_hints: Optional[list[CategoryHint]] = None
    meta_indicators: Optional[list[MetaIndicator]] = None
    fetched_text: Optional[str] = None


# Wraps one model's result when comparing multiple models side by side.
class SingleModelResult(BaseModel):
    model: str
    label: str
    confidence: float
    model_used: str
    word_contributions: Optional[list[WordContribution]] = None
    category_hints: Optional[list[CategoryHint]] = None
    meta_indicators: Optional[list[MetaIndicator]] = None


# All three models' predictions for the same input, returned as a list.
class AllPredictionsResponse(BaseModel):
    text: str
    threshold: float
    results: list[SingleModelResult]
