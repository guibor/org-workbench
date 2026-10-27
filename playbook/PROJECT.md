# Org Workbench — Project Playbook

> Single source of truth for what this project should do and for whom.

## Purpose

- Problem: Org files often open as raw text in AI workspaces despite containing structured documents.
- Users: Org/Emacs users, collaborators without Emacs, and MCP desktop users.
- Outcome: readable, editable documents that keep the original Org source intact.

## Scope

- In scope: local file handler, portable browser editor, exact rich edits, safe saves.
- Out of scope: Emacs replacement, agenda, code execution, cloud storage.
- Success: tests pass, plugin installs, original-file round-trip works in a supported host.

## Milestones

- Near term: release 0.2 with configurable reading profiles and prebuilt installation;
  qualify native desktop saving separately from user-confirmed opening and mocked tests.
- Next: collect real community fixtures and close compatibility gaps.
- Later: optional indexed links and measured large-file performance improvements.

## Open questions

- See `../prd.org` for the live requirements and next-step ledger.
