"""
모델 자동 다운로드 스크립트
HuggingFace에서 YOLOv8, BERT 모델을 backend/weights/ 에 다운로드합니다.
"""

import subprocess
import sys
from pathlib import Path

WEIGHTS_DIR = Path(__file__).resolve().parent / "weights"

MODELS = {
    "yolo": "https://huggingface.co/foduucom/stockmarket-pattern-detection-yolov8",
    "bert": "https://huggingface.co/hasnain43/bert-stock-sentiment-v1",
}


def main():
    WEIGHTS_DIR.mkdir(exist_ok=True)

    for name, repo_url in MODELS.items():
        target = WEIGHTS_DIR / name
        if target.exists() and any(target.iterdir()):
            print(f"[skip] {name} - already exists at {target}")
            continue

        print(f"[download] {name} from {repo_url} ...")
        result = subprocess.run(
            ["git", "clone", repo_url, str(target)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"[error] {name}: {result.stderr}")
            sys.exit(1)
        print(f"[done] {name} -> {target}")

    print()
    print("All models downloaded to backend/weights/")
    print("You can now start the server: python -m uvicorn main:app --port 8000")


if __name__ == "__main__":
    main()
