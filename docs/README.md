# docs/ — session documents moved

On **2026-09-09** the session documents that used to live here — gate docs,
recon docs, build/recon prompts, findings, closeouts, audits, and the
`archive/` subfolder — were moved out of the repository to:

    ~/Desktop/LobsterLog_docs/

272 files were moved; nothing was renamed or restructured. Any code comment,
prompt, or note that references `docs/<NAME>.md` now resolves to
`~/Desktop/LobsterLog_docs/<NAME>.md` (and `docs/archive/<NAME>.md` to
`~/Desktop/LobsterLog_docs/archive/<NAME>.md`).

## What deliberately stayed behind

- **`docs/DEVIATIONS_DECLARED.md`** — kept in the project on purpose, because
  Appendix B row 48 cites it. It must remain resolvable at its in-repo path.

## Not part of this move

- **`assets/docs/`** is untouched. That folder holds the bundled PDFs the app
  actually loads at runtime (user's guide, DFO instructions, prerequisites
  statement, provider instructions) and is unrelated to the session documents.
