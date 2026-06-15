import json
import pickle
import sys
from pathlib import Path


def main() -> int:
    payload = json.loads(sys.stdin.read() or "{}")
    model_path = Path(payload.get("modelPath", ""))
    features = payload.get("features", [])

    if not model_path.exists():
        sys.stderr.write("MODEL_NOT_FOUND")
        return 1

    with model_path.open("rb") as f:
        model = pickle.load(f)

    probability = float(model.predict_proba([features])[0][1])
    sys.stdout.write(json.dumps({"score_fraude": probability}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
