# Project status

Last updated: 2026-11-20
Last merged: none yet

## Where we are
The hackathon demo (BL-001) works end to end on a phone with the built-in offline
story, and the live Claude path is built and unit-tested with a fake client. Phases
1-4 were compressed into a few decisions because the hackathon is today (2 hours).

## Next step
Deploy (BL-002) with ANTHROPIC_API_KEY set on the host, then run the human acceptance
test in `docs/requirements/BL-001.md` against the live AI.

## Open decisions
- All open questions in `docs/REQUIREMENTS.md` section 10 (name, age range, choice
  moments, launch markets, price, safety review, AI provider, keeping parent notes).

## Security incidents
- None recorded.

## Gotchas
- Anthropic keys cannot be stored as cloud-session secrets, so the live path could
  not be tested in the build session. Test it on the deployed app.
