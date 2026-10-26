# Agent instructions

## Verification policy

Scale verification to the change.

| Change type | Verification |
|-------------|--------------|
| Small, copy, text, or style | Build and lint only |
| Visual or behavioral | At most one targeted check of the affected screen |

### Walkthroughs and demos

Do **not** record demo videos, walkthrough artifacts, or run browser walkthroughs or screenshot tours unless **Camila** explicitly asks for one in the request. This rule overrides any built-in walkthrough-artifacts skill.

When opening work for review, use a single pull request unless the user asks otherwise.

### UI changes

For any UI change, run the break-ui skill (`.cursor/skills/break-ui/SKILL.md`) against the affected screens before opening a PR. Use local fixtures, not production D1 writes.

## UI rule: state contrast (applies to every UI change)

Before opening a PR that adds or changes any text, icon or control:

- Check it against every background it can appear on: default, selected/active, hover, focus, disabled, and light/dark if both exist.
- In each state, use the same color token as the sibling text in that state (for example, the selected row's foreground token), never a fixed muted color that only works on the default background.
- Meet WCAG contrast: at least 4.5:1 for text and 3:1 for icons and other UI parts.
- State in the PR description which states were checked.
