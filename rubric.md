# Slop Scoring Rubric

Use this rubric to score each text from `0` to `4`.

## Trait 1: Specificity

Measures whether the text includes concrete facts, examples, names, numbers, or details.

- `0`: highly specific, grounded in real details
- `1`: mostly specific, a little abstract
- `2`: mixed concrete and vague language
- `3`: mostly vague, few real details
- `4`: almost entirely generic or empty

## Trait 2: Repetition

Measures whether the text repeats ideas, phrases, or structure without adding value.

- `0`: no noticeable repetition
- `1`: minor repetition
- `2`: repeated patterns are noticeable
- `3`: strong repetition across sentences or paragraphs
- `4`: very repetitive, padded, or template-like

## Trait 3: Information Density

Measures how much useful content appears per sentence or paragraph.

- `0`: dense with useful information
- `1`: mostly useful with a little filler
- `2`: balanced between signal and filler
- `3`: thin content, much more filler than signal
- `4`: almost no useful information

## Trait 4: Trustworthiness

Measures whether claims are supported, careful, and believable.

- `0`: well-supported and careful
- `1`: mostly trustworthy
- `2`: some unsupported or inflated claims
- `3`: many unsupported confident claims
- `4`: misleading, fake authority, or fabricated-sounding content

## Trait 5: Originality

Measures whether the writing shows distinct thinking versus template language.

- `0`: original and thoughtful
- `1`: somewhat distinctive
- `2`: average or familiar
- `3`: very formulaic
- `4`: obvious template or mass-produced style

## Trait 6: Usefulness

Measures whether a reader would actually get value from the text.

- `0`: very useful
- `1`: useful with minor fluff
- `2`: partially useful
- `3`: low usefulness
- `4`: not useful

## Final Label

After scoring each trait, assign:

- `final_score = rounded average of the six trait scores`

Example:

- Specificity: `3`
- Repetition: `4`
- Information Density: `3`
- Trustworthiness: `2`
- Originality: `4`
- Usefulness: `3`
- Average: `3.17`
- Final score: `3`

## Labeling Rules

- Judge the content quality, not whether you personally agree with it.
- Do not use grammar mistakes alone as evidence of slop.
- Short content can still be high quality if it is specific and useful.
- AI-written content is not automatically slop.
- Human-written content can absolutely be slop.
- If unsure between two scores, pick the lower one and explain why in notes.
