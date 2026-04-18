# gasburn development rules

## Verification
- NEVER commit without running `npx vitest run` and `node dist/cli.js providers` locally first
- For dashboard changes: run the interactive TUI (`npm run dev`) and visually confirm rendering
- For new providers: add a fixture and a test that loads at least one synthetic session

## Code quality
- Clean, minimal code. No dead code, no commented-out blocks, no TODO placeholders
- No emoji in the codebase
- No AI slop words ("leverage", "streamline", "seamless", "robust") in user-facing text
- TypeScript strict, no `any` (cast to `Record<string, unknown>` and narrow)
- No magic numbers. Extract thresholds and multipliers into named constants
- Imports: node builtins, deps, local — separated by blank line

## Accuracy
- Every user-facing number (cost, gas, tokens) must be verified against real data
- Pricing model matches must be exact. No fuzzy model IDs
- Date range math must be tested across month boundaries

## Git
- Branch per change: `feat/<name>`, `fix/<name>`, `chore/<name>`, `docs/<name>`
- Merge to main only after tests pass and CLI is verified manually
- Small, focused commits. One feature per commit
- External PRs: check out the contributor's branch, add patches on top, merge preserving authorship

## Public language
- Commits and release notes are public — write like you'd publish them
- Credit prior art (codeburn, LiteLLM) in README, not in commit messages
- No snark, no filler
