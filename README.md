# AI Slop Detector Starter

This starter folder helps define what "AI slop" means before building a model.

## Start Here

1. Read `rubric.md`.
2. Open `data/labeling_template.csv`.
3. Add 50 to 100 text samples.
4. Score each sample using the rubric.
5. Use the notes column to explain each score.

## Goal

We are not trying to prove whether content is AI-written.
We are trying to measure whether content is low-value, generic, repetitive, or untrustworthy.

## Suggested Score Meaning

- `0`: high-quality, specific, useful
- `1`: mostly good, minor filler
- `2`: mixed quality, noticeable filler or vagueness
- `3`: low-value, repetitive, thin
- `4`: extreme slop, spammy, empty, or misleading

## Sample Sources To Collect

- blog posts
- SEO landing pages
- product descriptions
- newsletter posts
- Reddit/forum posts
- AI-generated essays
- edited AI content
- strong human-written articles

## Next Step After Labeling

Once you have labeled data, we can build:

- a feature extractor
- a baseline classifier
- a scoring API or simple web app

## Training The Baseline

Run the baseline trainer with the bundled Python runtime:

```powershell
C:\Users\Anjali\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe train_baseline.py
```

It will:

- read `data/labeling_template.csv`
- bucket scores into `low`, `medium`, and `high`
- train a simple bag-of-words Naive Bayes model
- save outputs in `artifacts/`

## Web App

Run the local interface with:

```powershell
node serve_webapp.js
```

Then open:

```text
http://localhost:4173
```

The app will load the saved model from `artifacts/slop_baseline_model.json` and let you paste text for a prediction.
