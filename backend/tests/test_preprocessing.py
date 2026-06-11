"""
ToxiGuard AI — Preprocessing Tests
===================================
8 unit tests for the rule and model text preprocessing pipelines.
"""

import pytest
from utils.preprocessing import (
    preprocess_for_rules,
    preprocess_for_model,
    tokenize,
    preprocess,
)

# 1. Test rules preprocessing with basic lowercase and whitespace
def test_preprocess_for_rules_basic():
    assert preprocess_for_rules("  Hello World!  ") == "hello world"

# 2. Test rules preprocessing strips URLs and emails
def test_preprocess_for_rules_noise():
    text = "Check out http://google.com or email test@example.com for info"
    assert preprocess_for_rules(text) == "check out or email for info"

# 3. Test rules preprocessing de-obfuscates leet-speak
def test_preprocess_for_rules_leet():
    # @ -> a, $ -> s, 0 -> o, 1 -> i, 3 -> e, 4 -> a, 5 -> s, 7 -> t, *, !, _ -> deleted, - -> space
    text = "f*u*c*k y@u b!tch l1k3 th1s"
    assert preprocess_for_rules(text) == "fuck yau btch like this"

# 4. Test rules preprocessing handles emoji/non-ASCII by dropping them and stripping punctuation
def test_preprocess_for_rules_unicode_and_punctuation():
    text = "hello 🌟 world!!! bhosdike..."
    assert preprocess_for_rules(text) == "hello world bhosdike"

# 5. Test model preprocessing keeps case, punctuation, emoji, and unicode
def test_preprocess_for_model_preserves_semantics():
    text = "Hello 🌟 World! BHOSDIKE..."
    assert preprocess_for_model(text) == "Hello 🌟 World! BHOSDIKE..."

# 6. Test model preprocessing handles URLs and email placeholders
def test_preprocess_for_model_placeholders():
    text = "Go to http://example.com/xyz or mail user@domain.com now."
    assert preprocess_for_model(text) == "Go to [URL] or mail [EMAIL] now."

# 7. Test tokenize helper
def test_tokenize():
    assert tokenize("hello world test") == ["hello", "world", "test"]
    assert tokenize("") == []

# 8. Test preprocess backward-compatible wrapper keys and content
def test_preprocess_wrapper():
    text = "  Go to http://foo.bar BHOSD1KE! 😊  "
    result = preprocess(text)
    assert isinstance(result, dict)
    assert "clean_text" in result
    assert "model_text" in result
    assert "tokens" in result
    assert result["clean_text"] == "go to bhosdike"
    assert result["model_text"] == "Go to [URL] BHOSD1KE! 😊"
    assert result["tokens"] == ["go", "to", "bhosdike"]

# 9. Test edge cases
@pytest.mark.parametrize("text", [None, "", "   ", "\n\t"])
def test_preprocessing_edge_cases(text):
    assert preprocess_for_rules(text) == ""
    assert preprocess_for_model(text) == ""
    assert tokenize(text) == []
    wrapper = preprocess(text)
    assert wrapper["clean_text"] == ""
    assert wrapper["model_text"] == ""
    assert wrapper["tokens"] == []
