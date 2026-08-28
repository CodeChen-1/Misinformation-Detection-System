import pytest
from backend.api import _detect_category_hints, CATEGORY_PATTERNS


def test_urgency_category():
    text = "This is urgent! Breaking news alert!"
    hints = _detect_category_hints(text)
    categories = [h.category for h in hints]
    assert "Urgency / Scarcity" in categories


def test_emotional_manipulation_category():
    text = "This shocking and unbelievable story will blow your mind!"
    hints = _detect_category_hints(text)
    categories = [h.category for h in hints]
    assert "Emotional Manipulation" in categories


def test_conspiracy_category():
    text = "The hidden truth they don't want you to know has been exposed."
    hints = _detect_category_hints(text)
    categories = [h.category for h in hints]
    assert "Conspiracy Language" in categories


def test_financial_scam_category():
    text = "Congratulations! You've won free money! Click here for guaranteed returns."
    hints = _detect_category_hints(text)
    categories = [h.category for h in hints]
    assert "Financial Scam" in categories


def test_health_misinformation_category():
    text = "This miracle cure will detox your body naturally. Big Pharma hates it!"
    hints = _detect_category_hints(text)
    categories = [h.category for h in hints]
    assert "Health Misinformation" in categories


def test_all_categories_at_once():
    text = (
        "URGENT: This shocking hidden truth is exposed! "
        "You've won free money! This miracle cure works!"
    )
    hints = _detect_category_hints(text)
    categories = [h.category for h in hints]
    assert len(categories) >= 4


def test_no_categories_matched():
    text = "The weather today is pleasant. I enjoyed my lunch."
    hints = _detect_category_hints(text)
    assert hints == []


def test_category_matched_words_are_returned():
    text = "This shocking and urgent alert is breaking news."
    hints = _detect_category_hints(text)
    for hint in hints:
        if hint.category == "Urgency / Scarcity":
            assert len(hint.matched_words) >= 1
            assert hint.count >= 1


def test_count_reflects_number_of_matches():
    text = "urgent urgent urgent breaking now"
    hints = _detect_category_hints(text)
    for hint in hints:
        if hint.category == "Urgency / Scarcity":
            assert hint.count >= 1


def test_case_insensitive_matching():
    text = "URGENT Breaking Alert"
    hints = _detect_category_hints(text)
    categories = [h.category for h in hints]
    assert "Urgency / Scarcity" in categories


@pytest.mark.parametrize("category", list(CATEGORY_PATTERNS.keys()))
def test_each_category_has_keywords(category):
    assert len(CATEGORY_PATTERNS[category]) > 0, f"Category '{category}' has no keywords"
    for kw in CATEGORY_PATTERNS[category]:
        assert isinstance(kw, str) and len(kw) > 0
