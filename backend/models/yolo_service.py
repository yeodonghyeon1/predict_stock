import io
import os
import base64
from pathlib import Path

from PIL import Image
from ultralytics import YOLO

_BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = Path(os.environ.get("YOLO_MODEL_PATH") or str(_BACKEND_DIR / "weights" / "yolo" / "model.pt"))

CLASSES = [
    "Head and shoulders bottom",
    "Head and shoulders top",
    "M_Head",
    "StockLine",
    "Triangle",
    "W_Bottom",
]

SIGNAL_MAP = {
    "Head and shoulders bottom": {"signal": "Buy", "ko": "매수", "icon": "up"},
    "Head and shoulders top": {"signal": "Sell", "ko": "매도", "icon": "down"},
    "M_Head": {"signal": "Sell", "ko": "매도", "icon": "down"},
    "W_Bottom": {"signal": "Buy", "ko": "매수", "icon": "up"},
    "Triangle": {"signal": "Hold", "ko": "관망", "icon": "neutral"},
    "StockLine": {"signal": "Trend", "ko": "추세 확인", "icon": "neutral"},
}

_model = None


def get_model():
    global _model
    if _model is None:
        _model = YOLO(str(MODEL_PATH))
    return _model


def analyze_chart(image_bytes: bytes) -> dict:
    model = get_model()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    results = model(image, conf=0.25)
    result = results[0]

    detections = []
    if result.boxes and len(result.boxes) > 0:
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()
            label = CLASSES[cls_id] if cls_id < len(CLASSES) else f"class_{cls_id}"
            signal_info = SIGNAL_MAP.get(label, {"signal": "Unknown", "ko": "알 수 없음", "icon": "neutral"})

            detections.append({
                "pattern": label,
                "confidence": round(conf, 3),
                "bbox": [round(v, 1) for v in xyxy],
                "signal": signal_info["signal"],
                "signal_ko": signal_info["ko"],
                "icon": signal_info["icon"],
            })

    annotated_img = result.plot()
    pil_annotated = Image.fromarray(annotated_img[..., ::-1])
    buf = io.BytesIO()
    pil_annotated.save(buf, format="JPEG", quality=85)
    annotated_b64 = base64.b64encode(buf.getvalue()).decode()

    primary_signal = "Hold"
    primary_signal_ko = "관망"
    if detections:
        best = max(detections, key=lambda d: d["confidence"])
        primary_signal = best["signal"]
        primary_signal_ko = best["signal_ko"]

    return {
        "detections": detections,
        "annotated_image": f"data:image/jpeg;base64,{annotated_b64}",
        "primary_signal": primary_signal,
        "primary_signal_ko": primary_signal_ko,
        "pattern_count": len(detections),
    }
