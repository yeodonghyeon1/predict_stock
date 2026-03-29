import os
from pathlib import Path

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

_BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = Path(os.environ.get("BERT_MODEL_PATH", str(_BACKEND_DIR / "weights" / "bert")))

LABEL_MAP = {0: "negative", 1: "neutral", 2: "positive"}
SIGNAL_MAP = {
    "positive": {"signal": "Buy", "ko": "매수 고려", "icon": "up"},
    "neutral": {"signal": "Hold", "ko": "관망", "icon": "neutral"},
    "negative": {"signal": "Sell", "ko": "매도 고려", "icon": "down"},
}

_tokenizer = None
_model = None


def get_model():
    global _tokenizer, _model
    if _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
        _model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH))
        if torch.cuda.is_available():
            _model = _model.to("cuda")
        _model.eval()
    return _tokenizer, _model


def analyze_sentiment(text: str) -> dict:
    tokenizer, model = get_model()
    device = next(model.parameters()).device

    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)[0]

    pred_id = torch.argmax(probs).item()
    label = LABEL_MAP[pred_id]
    signal_info = SIGNAL_MAP[label]

    return {
        "sentiment": label,
        "confidence": round(probs[pred_id].item(), 3),
        "scores": {
            "negative": round(probs[0].item(), 3),
            "neutral": round(probs[1].item(), 3),
            "positive": round(probs[2].item(), 3),
        },
        "signal": signal_info["signal"],
        "signal_ko": signal_info["ko"],
        "icon": signal_info["icon"],
    }


def analyze_batch(texts: list[str]) -> list[dict]:
    return [analyze_sentiment(t) for t in texts]
