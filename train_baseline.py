import argparse
import csv
import json
import math
import random
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


TOKEN_RE = re.compile(r"[A-Za-z0-9']+")


def tokenize(text: str) -> List[str]:
    return [token.lower() for token in TOKEN_RE.findall(text)]


def score_to_tier(score: int) -> str:
    if score <= 1:
        return "low"
    if score == 2:
        return "medium"
    return "high"


def load_dataset(csv_path: Path) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            row = {
                (key or "").replace("\ufeff", "").strip(): value
                for key, value in row.items()
            }
            text = (row.get("text") or "").strip()
            score = (row.get("final_score") or "").strip()
            if not text or not score:
                continue
            row["final_score"] = str(int(float(score)))
            rows.append(row)
    return rows


def stratified_split(
    rows: Sequence[Dict[str, str]],
    test_ratio: float,
    seed: int,
) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
    rng = random.Random(seed)
    buckets: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for row in rows:
        buckets[score_to_tier(int(row["final_score"]))].append(row)

    train_rows: List[Dict[str, str]] = []
    test_rows: List[Dict[str, str]] = []
    for bucket_rows in buckets.values():
        shuffled = list(bucket_rows)
        rng.shuffle(shuffled)
        test_count = max(1, round(len(shuffled) * test_ratio))
        if test_count >= len(shuffled):
            test_count = len(shuffled) - 1
        test_rows.extend(shuffled[:test_count])
        train_rows.extend(shuffled[test_count:])
    rng.shuffle(train_rows)
    rng.shuffle(test_rows)
    return train_rows, test_rows


class MultinomialNaiveBayes:
    def __init__(self, alpha: float = 1.0) -> None:
        self.alpha = alpha
        self.labels: List[str] = []
        self.doc_counts: Counter = Counter()
        self.token_counts: Dict[str, Counter] = defaultdict(Counter)
        self.total_tokens: Counter = Counter()
        self.vocab: set[str] = set()

    def fit(self, texts: Iterable[str], labels: Iterable[str]) -> None:
        for text, label in zip(texts, labels):
            self.doc_counts[label] += 1
            for token in tokenize(text):
                self.vocab.add(token)
                self.token_counts[label][token] += 1
                self.total_tokens[label] += 1
        self.labels = sorted(self.doc_counts)

    def predict_one(self, text: str) -> Tuple[str, Dict[str, float]]:
        tokens = tokenize(text)
        total_docs = sum(self.doc_counts.values())
        vocab_size = max(1, len(self.vocab))
        scores: Dict[str, float] = {}
        for label in self.labels:
            log_prob = math.log(self.doc_counts[label] / total_docs)
            label_total = self.total_tokens[label]
            denom = label_total + self.alpha * vocab_size
            for token in tokens:
                token_count = self.token_counts[label][token]
                log_prob += math.log((token_count + self.alpha) / denom)
            scores[label] = log_prob
        best_label = max(scores, key=scores.get)
        return best_label, scores

    def predict(self, texts: Iterable[str]) -> List[str]:
        return [self.predict_one(text)[0] for text in texts]

    def export(self) -> Dict[str, object]:
        return {
            "model_type": "multinomial_naive_bayes",
            "alpha": self.alpha,
            "labels": self.labels,
            "doc_counts": dict(self.doc_counts),
            "total_tokens": dict(self.total_tokens),
            "token_counts": {
                label: dict(counter)
                for label, counter in self.token_counts.items()
            },
        }


def accuracy_score(y_true: Sequence[str], y_pred: Sequence[str]) -> float:
    correct = sum(1 for truth, pred in zip(y_true, y_pred) if truth == pred)
    return correct / len(y_true) if y_true else 0.0


def confusion_matrix(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    labels: Sequence[str],
) -> List[List[int]]:
    index = {label: idx for idx, label in enumerate(labels)}
    matrix = [[0 for _ in labels] for _ in labels]
    for truth, pred in zip(y_true, y_pred):
        matrix[index[truth]][index[pred]] += 1
    return matrix


def classification_rows(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    labels: Sequence[str],
) -> List[Dict[str, float]]:
    rows = []
    for label in labels:
        tp = sum(1 for truth, pred in zip(y_true, y_pred) if truth == pred == label)
        fp = sum(1 for truth, pred in zip(y_true, y_pred) if pred == label and truth != label)
        fn = sum(1 for truth, pred in zip(y_true, y_pred) if truth == label and pred != label)
        support = sum(1 for truth in y_true if truth == label)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
        rows.append(
            {
                "label": label,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "support": support,
            }
        )
    return rows


def write_model_summary(
    output_path: Path,
    train_rows: Sequence[Dict[str, str]],
    test_rows: Sequence[Dict[str, str]],
    labels: Sequence[str],
    matrix: Sequence[Sequence[int]],
    report_rows: Sequence[Dict[str, float]],
    accuracy: float,
) -> None:
    lines = [
        "Baseline AI Slop Detector",
        f"Train rows: {len(train_rows)}",
        f"Test rows: {len(test_rows)}",
        f"Accuracy: {accuracy:.3f}",
        "",
        "Labels: " + ", ".join(labels),
        "",
        "Confusion matrix (rows=true, cols=pred):",
    ]
    for idx, label in enumerate(labels):
        lines.append(f"{label:>6}: {matrix[idx]}")
    lines.append("")
    lines.append("Per-class metrics:")
    for row in report_rows:
        lines.append(
            f"{row['label']:>6}  "
            f"precision={row['precision']:.3f}  "
            f"recall={row['recall']:.3f}  "
            f"f1={row['f1']:.3f}  "
            f"support={row['support']}"
        )
    output_path.write_text("\n".join(lines), encoding="utf-8")


def save_predictions(
    output_path: Path,
    rows: Sequence[Dict[str, str]],
    predictions: Sequence[str],
) -> None:
    fieldnames = [
        "sample_id",
        "source_type",
        "true_score",
        "true_tier",
        "predicted_tier",
        "text_preview",
    ]
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row, prediction in zip(rows, predictions):
            text_preview = " ".join((row["text"] or "").split())[:160]
            writer.writerow(
                {
                    "sample_id": row["sample_id"],
                    "source_type": row["source_type"],
                    "true_score": row["final_score"],
                    "true_tier": score_to_tier(int(row["final_score"])),
                    "predicted_tier": prediction,
                    "text_preview": text_preview,
                }
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a baseline slop classifier.")
    parser.add_argument(
        "--dataset",
        default="data/labeling_template.csv",
        help="Path to the labeled CSV dataset.",
    )
    parser.add_argument(
        "--output-dir",
        default="artifacts",
        help="Directory where model outputs will be saved.",
    )
    parser.add_argument(
        "--test-ratio",
        type=float,
        default=0.25,
        help="Fraction of rows to reserve for evaluation.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for the train/test split.",
    )
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rows = load_dataset(dataset_path)
    if len(rows) < 12:
        raise ValueError("Need at least 12 labeled rows to train a baseline model.")

    train_rows, test_rows = stratified_split(rows, args.test_ratio, args.seed)
    train_texts = [row["text"] for row in train_rows]
    train_labels = [score_to_tier(int(row["final_score"])) for row in train_rows]
    test_texts = [row["text"] for row in test_rows]
    test_labels = [score_to_tier(int(row["final_score"])) for row in test_rows]

    model = MultinomialNaiveBayes(alpha=1.0)
    model.fit(train_texts, train_labels)

    predictions = model.predict(test_texts)
    labels = ["low", "medium", "high"]
    accuracy = accuracy_score(test_labels, predictions)
    matrix = confusion_matrix(test_labels, predictions, labels)
    report_rows = classification_rows(test_labels, predictions, labels)

    model_path = output_dir / "slop_baseline_model.json"
    summary_path = output_dir / "training_report.txt"
    predictions_path = output_dir / "test_predictions.csv"

    model_path.write_text(json.dumps(model.export(), indent=2), encoding="utf-8")
    write_model_summary(summary_path, train_rows, test_rows, labels, matrix, report_rows, accuracy)
    save_predictions(predictions_path, test_rows, predictions)

    print(f"Loaded {len(rows)} labeled rows from {dataset_path}")
    print(f"Train rows: {len(train_rows)}")
    print(f"Test rows: {len(test_rows)}")
    print(f"Accuracy: {accuracy:.3f}")
    print(f"Saved model to {model_path}")
    print(f"Saved report to {summary_path}")
    print(f"Saved test predictions to {predictions_path}")


if __name__ == "__main__":
    main()
