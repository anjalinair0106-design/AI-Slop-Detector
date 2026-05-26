const state = {
  model: null,
  sampleIndex: 0,
};

const sampleTexts = [
  `In today's fast-paced business environment, success depends on adopting the right mindset, leveraging powerful tools, and staying committed to continuous improvement. When teams align around innovation and focus on high-impact strategies, they can unlock growth, streamline operations, and elevate performance to the next level.`,
  `The article does not just say AI makes people faster. It identifies the actual bottleneck: managers now have to review and redirect work at a much higher cadence than older operating norms assumed. That framing is specific, practical, and grounded in observed workplace behavior.`,
  `This lightweight gel-cream moisturizer uses oil-absorbing technology to help rebalance oily skin so it feels neither too shiny nor too dry. The copy is straightforward, aiming to reassure shoppers about texture, finish, and everyday comfort.`,
];

const suspiciousPhrases = [
  "in today's fast-paced",
  "more important than ever",
  "take it to the next level",
  "unlock your potential",
  "game-changing",
  "ultimate guide",
  "transform your routine",
  "must-have",
  "powerful results",
  "life-changing",
];

const abstractBuzzwords = [
  "innovative",
  "innovation",
  "potential",
  "success",
  "growth",
  "mindset",
  "performance",
  "results",
  "transform",
  "transformation",
  "elevate",
  "opportunities",
  "strategy",
  "strategies",
  "impact",
  "unlock",
  "future",
  "optimize",
  "productivity",
  "adaptable",
  "proactive",
  "high-impact",
];

const concreteSignals = [
  "2024",
  "2025",
  "2026",
  "percent",
  "%",
  "dollar",
  "hours",
  "minutes",
  "study",
  "report",
  "according",
  "researchers",
  "doctor",
  "dr",
];

const tierOrder = ["low", "medium", "high"];

const els = {
  analyzeButton: document.querySelector("#analyze-button"),
  clearButton: document.querySelector("#clear-button"),
  confidence: document.querySelector("#confidence"),
  emptyState: document.querySelector("#empty-state"),
  inputMeta: document.querySelector("#input-meta"),
  loadSample: document.querySelector("#load-sample"),
  modelBadge: document.querySelector("#model-badge"),
  phraseHits: document.querySelector("#phrase-hits"),
  predictedTier: document.querySelector("#predicted-tier"),
  reasonList: document.querySelector("#reason-list"),
  resultState: document.querySelector("#result-state"),
  textInput: document.querySelector("#text-input"),
  uniqueRatio: document.querySelector("#unique-ratio"),
  wordCount: document.querySelector("#word-count"),
  bars: {
    low: document.querySelector("#bar-low"),
    medium: document.querySelector("#bar-medium"),
    high: document.querySelector("#bar-high"),
  },
};

function showMessage(message) {
  els.emptyState.innerHTML = `<p>${message}</p>`;
  els.emptyState.classList.remove("hidden");
  els.resultState.classList.add("hidden");
}

function tokenize(text) {
  return (text.match(/[A-Za-z0-9']+/g) || []).map((token) => token.toLowerCase());
}

function scoreToPercentages(scores) {
  const values = Object.values(scores);
  const maxValue = Math.max(...values);
  const exps = {};
  let total = 0;
  for (const [label, value] of Object.entries(scores)) {
    const expValue = Math.exp(value - maxValue);
    exps[label] = expValue;
    total += expValue;
  }
  const percentages = {};
  for (const [label, value] of Object.entries(exps)) {
    percentages[label] = value / total;
  }
  return percentages;
}

function analyzeHeuristics(text, tokens) {
  const uniqueCount = new Set(tokens).size;
  const uniqueRatio = tokens.length ? uniqueCount / tokens.length : 0;
  const lowered = text.toLowerCase();
  const phraseHits = suspiciousPhrases.filter((phrase) => lowered.includes(phrase));
  const buzzwordHits = abstractBuzzwords.filter((word) => lowered.includes(word));
  const concreteHits = concreteSignals.filter((signal) => lowered.includes(signal));
  const numberMatches = text.match(/\b\d+(?:\.\d+)?\b/g) || [];
  const sentenceChunks = text
    .split(/[.!?]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const longSentenceCount = sentenceChunks.filter(
    (sentence) => tokenize(sentence).length >= 28,
  ).length;
  const namedEntityLikeCount = (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;

  const reasons = [];
  const concerns = [];

  if (phraseHits.length >= 2) {
    concerns.push("It uses multiple generic hype phrases that often show up in low-value marketing or AI filler.");
  } else if (phraseHits.length === 1) {
    concerns.push("It contains at least one stock phrase that can make the writing feel generic.");
  }

  if (buzzwordHits.length >= 4) {
    concerns.push("It leans heavily on abstract buzzwords like growth, success, performance, or transformation instead of giving concrete details.");
  } else if (buzzwordHits.length >= 2) {
    concerns.push("It uses several broad business or self-improvement terms that can make the writing feel polished but thin.");
  }

  if (numberMatches.length === 0 && concreteHits.length === 0 && namedEntityLikeCount < 2) {
    concerns.push("It gives almost no concrete anchors such as numbers, dates, cited sources, or named entities.");
  }

  if (uniqueRatio < 0.55) {
    concerns.push("The vocabulary repeats a lot, which can be a sign of padded or formulaic writing.");
  } else if (uniqueRatio > 0.72) {
    reasons.push("The wording is relatively varied, so the text is not being flagged for raw repetition alone.");
  }

  if (longSentenceCount >= 2) {
    concerns.push("Several long sentences pack in multiple claims, which can blur clarity when the content stays abstract.");
  }

  if (tokens.length < 50) {
    reasons.push("This excerpt is short, so the prediction is less stable than it would be on a longer sample.");
  }

  if (concerns.length) {
    reasons.unshift(...concerns);
  }

  if (!reasons.length) {
    reasons.push("The result mostly comes from how the wording overlaps with patterns seen in your labeled training set.");
  }

  return {
    buzzwordHits,
    concreteHits,
    concerns,
    uniqueRatio,
    phraseHits,
    reasons,
    wordCount: tokens.length,
  };
}

function predict(text) {
  const model = state.model;
  if (!model) {
    throw new Error("Model is still loading. Wait a moment and try again.");
  }
  const tokens = tokenize(text);
  const vocabSize = Object.keys(model.vocabulary).length;
  const totalDocs = Object.values(model.doc_counts).reduce((sum, count) => sum + count, 0);

  const scores = {};
  for (const label of model.labels) {
    let logProb = Math.log(model.doc_counts[label] / totalDocs);
    const labelTotal = model.total_tokens[label];
    const denom = labelTotal + model.alpha * vocabSize;
    const tokenCounts = model.token_counts[label] || {};
    for (const token of tokens) {
      const tokenCount = tokenCounts[token] || 0;
      logProb += Math.log((tokenCount + model.alpha) / denom);
    }
    scores[label] = logProb;
  }

  const percentages = scoreToPercentages(scores);
  const predictedTier = Object.entries(percentages).sort((a, b) => b[1] - a[1])[0][0];
  const heuristics = analyzeHeuristics(text, tokens);

  return {
    predictedTier,
    percentages,
    heuristics,
  };
}

function renderResult(result) {
  const { predictedTier, percentages, heuristics } = result;
  els.emptyState.classList.add("hidden");
  els.resultState.classList.remove("hidden");

  els.predictedTier.textContent = predictedTier[0].toUpperCase() + predictedTier.slice(1);
  els.predictedTier.style.color =
    predictedTier === "high" ? "#aa3c2f" : predictedTier === "medium" ? "#c46b2a" : "#2f855a";
  els.confidence.textContent = `${Math.round(percentages[predictedTier] * 100)}%`;
  els.wordCount.textContent = String(heuristics.wordCount);
  els.uniqueRatio.textContent = heuristics.uniqueRatio.toFixed(2);
  els.phraseHits.textContent = String(heuristics.phraseHits.length);

  for (const tier of tierOrder) {
    const width = `${Math.round((percentages[tier] || 0) * 100)}%`;
    els.bars[tier].style.width = width;
  }

  els.reasonList.innerHTML = "";
  heuristics.reasons.forEach((reason) => {
    const li = document.createElement("li");
    li.textContent = reason;
    els.reasonList.appendChild(li);
  });
}

function updateWordMeta() {
  const words = tokenize(els.textInput.value).length;
  els.inputMeta.textContent = `${words} words`;
}

async function loadModel() {
  const response = await fetch("/artifacts/slop_baseline_model.json");
  if (!response.ok) {
    throw new Error(`Model request failed with status ${response.status}.`);
  }
  const rawModel = await response.json();
  const vocabulary = {};
  for (const tokenCounts of Object.values(rawModel.token_counts)) {
    for (const token of Object.keys(tokenCounts)) {
      vocabulary[token] = true;
    }
  }
  state.model = {
    ...rawModel,
    vocabulary,
  };
  els.modelBadge.textContent = "Baseline model ready";
  els.analyzeButton.disabled = false;
  els.analyzeButton.textContent = "Analyze Text";
  showMessage("Run the detector to see the predicted slop tier and signal breakdown.");
}

els.analyzeButton.disabled = true;
els.analyzeButton.textContent = "Loading Model...";

els.textInput.addEventListener("input", updateWordMeta);

els.clearButton.addEventListener("click", () => {
  els.textInput.value = "";
  updateWordMeta();
  els.resultState.classList.add("hidden");
  els.emptyState.classList.remove("hidden");
});

els.loadSample.addEventListener("click", () => {
  els.textInput.value = sampleTexts[state.sampleIndex % sampleTexts.length];
  state.sampleIndex += 1;
  updateWordMeta();
});

els.analyzeButton.addEventListener("click", () => {
  const text = els.textInput.value.trim();
  if (!text) {
    els.reasonList.innerHTML = "<li>Paste some text first so the model has something to score.</li>";
    els.resultState.classList.remove("hidden");
    els.emptyState.classList.add("hidden");
    return;
  }
  try {
    const result = predict(text);
    renderResult(result);
  } catch (error) {
    showMessage(error.message);
  }
});

loadModel()
  .catch((error) => {
    els.modelBadge.textContent = "Model failed to load";
    showMessage(`Could not load the model file. ${error.message}`);
  })
  .finally(updateWordMeta);
