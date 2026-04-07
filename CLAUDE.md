# CLAUDE.md — Claude Code Operating Instructions

> This file is automatically read by Claude Code on every session start.
> It defines how all AI agents must behave in this repository.

---

## Startup Checklist (Run Before Every Task)

Before taking any action, read these files in order:

1. `AGENTS.md` — Governance rules and hard constraints
2. `context/project_definition.md` — What this project is and its goals
3. `context/agent_roles.md` — Role definitions and handoff protocol
4. `context/shared_knowledge.md` — Shared domain knowledge and conventions

If you are working on a specific sprint issue, also read:
- `sprints/{YYYY-MM-DD}/issue_{XXX}/plan.md` (if it exists)

---

## Your Identity

You are a specialized AI development agent operating in a multi-agent system.
Your specific role is determined by the prompt that invoked you (see `agents/`).
You are NOT a general-purpose assistant in this context — stay focused on your assigned role.

---

## Git Conventions

- **Branch naming:** `agent/{issue-number}/{brief-description}` (e.g., `agent/42/add-auth-endpoint`)
- **Commit messages:** `[Agent:{ROLE}] {description} (issue #{number})`
  - Example: `[Agent:Dev] Implement JWT middleware (issue #42)`
- **NEVER push directly to `main`** — always create a PR
- **NEVER merge your own PR** — human approval is required
- **NEVER modify** `AGENTS.md`, `CLAUDE.md`, or `context/agent_roles.md` unless explicitly instructed by a human

---

## TypeScript Standards

- Strict mode required (`"strict": true` in tsconfig)
- No `any` types — use `unknown` and narrow properly
- All functions must have explicit return types
- Named exports only (no default exports except React components)
- Test files co-located: `{file}.test.ts` or `{file}.spec.ts`
- Minimum **80% test coverage** for all new code
- Run before every PR: `npm run lint && npm test`

---

## Output Requirements for Every Task

Upon completing any assigned task, you MUST generate two report files in the sprint issue folder:

### `report_human.md`
```
## Task Summary
## Key Changes
## Items Requiring Human Review
## Learning Points (technologies or concepts a human reviewer should know)
## Suggested Next Steps
```

### `report_ai.md`
```
## Task Scope and Completion Status
## Dependencies and Related Modules
## Open Issues and Technical Debt
## Context for Next Agent
## Patterns Used and Decision Rationale
```

Store both reports at: `sprints/{YYYY-MM-DD}/issue_{XXX}/`

---

## PR Description Format

When creating a PR, use this format:

```
## Summary
[1-3 bullet points of what changed]

## Issue
Closes #{issue_number}

## Agent Role
{your role, e.g., DevAgent-B}

## Test Results
- [ ] lint: passed
- [ ] unit tests: passed (coverage: XX%)

## Human Review Required For
[specific items that need human judgment]
```

---

## Error Handling Rules

- Never throw raw strings: use typed error classes
- Never swallow errors silently
- If you encounter an ambiguity or blocker, create a GitHub Issue comment describing it — do NOT guess
- If a task is beyond your defined scope, stop and comment on the issue

---

## MCP Tools Available

- **GitHub MCP** — read/write issues, PRs, comments, branches
- **Slack MCP** — read channel messages (Messenger Collection Agent only)
- **Filesystem** — read/write files in this repo

Do NOT attempt to call external APIs not defined in the project codebase.
