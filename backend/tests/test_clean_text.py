import pytest
from backend.api import _clean_text


def test_clean_text_normal():
    result = _clean_text("Hello World")
    assert result == "hello world"


def test_clean_text_removes_urls():
    result = _clean_text("Check http://example.com and https://test.com/page")
    assert "http" not in result
    assert "example" not in result
    assert result == "check and"


def test_clean_text_removes_mentions():
    result = _clean_text("Hello @user and @another_user")
    assert "@user" not in result
    assert "@another_user" not in result
    assert result == "hello and"


def test_clean_text_removes_hashtags():
    result = _clean_text("Trending #topic and #hashtag")
    assert "#topic" not in result
    assert "#hashtag" not in result
    assert result == "trending and"


def test_clean_text_removes_non_alpha():
    result = _clean_text("Hello!!! 123 World ***")
    assert "hello" in result
    assert "world" in result
    assert "123" not in result
    assert result == "hello world"


def test_clean_text_lowercases():
    result = _clean_text("UPPER lower MIXED")
    assert result == "upper lower mixed"


def test_clean_text_collapses_whitespace():
    result = _clean_text("Hello    World   spaced")
    assert result == "hello world spaced"


def test_clean_text_strips_whitespace():
    result = _clean_text("   Hello World   ")
    assert result == "hello world"


def test_clean_text_all_punctuation():
    result = _clean_text("!!!??? 123 *** @@@")
    assert result == ""


def test_clean_text_empty_string():
    result = _clean_text("")
    assert result == ""


def test_clean_text_mixed():
    result = _clean_text("URGENT: Check http://x.com @user #trending — free money!!!")
    assert "urgent" in result
    assert "check" in result
    assert "free" in result
    assert "money" in result
    assert "http" not in result
    assert "@user" not in result
    assert "#trending" not in result
    assert result == "urgent check free money"
