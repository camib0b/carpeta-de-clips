# Agent instructions

## Scope and approach

1. **Think before coding.** State your assumptions; ask questions or flag ambiguity before you edit.
2. **Keep it simple.** Deliver the smallest change that satisfies the request—no speculative abstractions, options, or extra features.
3. **Surgical changes.** Touch only the files and lines the task requires; skip unrelated refactors, renames, restyling, or formatting churn.
4. **Checkable success criteria.** Before you start, note concrete conditions that mean the work is done; confirm them to the extent the task allows.

## Verification policy

Scale verification to the change.

| Change type | Verification |
|-------------|--------------|
| Small, copy, text, or style | Build and lint only |
| Visual or behavioral | At most one targeted check of the affected screen |

### Walkthroughs and demos

Do **not** record demo videos, walkthrough artifacts, or run browser walkthroughs or screenshot tours unless **Camila** explicitly asks for one in the request. This rule overrides any built-in walkthrough-artifacts skill.

When opening work for review, use a single pull request unless the user asks otherwise.
