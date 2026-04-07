# AGENTS.md — System Governance Constitution

> **All AI agents operating in this repository must read this file before taking any action.**
> This document defines the rules, boundaries, and standards that govern all agent behavior.
> This file may ONLY be modified by a human with explicit team approval.

---

## 1. Agent Authorization Levels

| Action | Allowed | Notes |
|--------|---------|-------|
| Read any file in the repo | ✅ | Always permitted |
| Write files in `sprints/`, `planning/`, `decisions/` | ✅ | Core agent output |
| Write source code files | ✅ | Dev agents only |
| Create branches | ✅ | Follow naming convention |
| Create commits | ✅ | Follow commit format in CLAUDE.md |
| Create GitHub Issues (bugs) | ✅ | QA agent only |
| Comment on Issues and PRs | ✅ | Any agent |
| Create Pull Requests | ✅ | Dev agents, after tests pass |
| **Push to `main` branch** | ❌ | Never — human only |
| **Merge PRs** | ❌ | Never — human approval required |
| **Modify AGENTS.md or CLAUDE.md** | ❌ | Human-only |
| **Delete files** | ❌ | Requires explicit human instruction |
| **Call external APIs** not in codebase | ❌ | Not permitted |
| **Store or log PII data** | ❌ | Absolute prohibition |

---

## 2. Architecture Boundaries (TypeScript)

### Layer Rules
```
Request → Controller → ApplicationService → DomainService → Repository
```
- Controllers call **only** ApplicationService methods — never Repository directly
- Domain logic lives in DomainService — never in Controller or Repository
- Repository handles **only** data access — no business logic
- Cross-module communication via defined interfaces only — no direct imports across module boundaries

### File Structure Convention
```
src/
├── modules/
│   └── {module-name}/
│       ├── {module-name}.controller.ts
│       ├── {module-name}.service.ts
│       ├── {module-name}.repository.ts
│       ├── {module-name}.types.ts
│       └── {module-name}.test.ts
├── shared/
│   ├── errors/
│   ├── types/
│  #└── utils/
└── index.ts
```

### Prohibited Patterns
- ❌ `N+1` query patterns — always use joins or batch loading
- ❌ `any` TypeScript type
- ❌ Direct `console.log` in production code — use the logger service
- ❌ Hardcoded secrets or URLs — use environment variables
- ❌ Circular dependencies between modules
- ❌ `throw new Error('string')` — use typed error classes from `src/shared/errors/`

---

## 3. Error Handling Standard

All errors must extend the base `AppError` class:

```typescript
// src/shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

Example usage:
```typescript
throw new ValidationError('INVALID_INPUT', 'Email format is invalid', { field: 'email' });
```

---

## 4. Test Requirements

Before any PR can be created, the agent MUST verify:

- [ ] `npm run lint` — zero errors (warnings acceptable)
- [ ] `npm test` — all tests pass
- [ ] Coverage ≥ 80% for newly added code
- [ ] No skipped tests (`it.skip`, `xit`) in new files

Test naming convention:
```
describe('{ClassName}', () => {
  describe('{methodName}', () => {
    it('should {expected behavior} when {condition}', () => { ... });
  });
});
```

---

## 5. Security Rules

- **Never log PII** (emails, names, phone numbers, passwords, tokens)
- **Never commit** `.env`, API keys, or secrets
- All external input must be validated before processing
- SQL queries must use parameterized queries only — no string interpolation
- Dependencies must be reviewed before adding (`npm audit` must pass)

---

## 6. Documentation Rules

- All public functions and classes must have JSDoc comments
- Architecture decisions must be recorded as ADRs in `decisions/ADR_{NNN}_{title}.md`
- Any change to the system architecture requires a new ADR before implementation
- Mermaid diagrams are the standard for all flow and architecture documentation

---

## 7. Agent Handoff Protocol

When handing off work to the next agent:

1. Commit all files to the branch
2. Write `report_ai.md` with complete context for the next agent
3. Update the sprint issue folder with the current status
4. Comment on the GitHub Issue with completion status and handoff notes
5. Tag the appropriate next agent label on the issue

---

## 8. Human Escalation Triggers

An agent MUST stop and request human input when:

- Requirements are ambiguous and the interpretation changes scope
- An architectural decision is needed not covered by this document
- A security concern is identified
- Tests are failing and the cause is not clear
- The task would require modifying `AGENTS.md` or `CLAUDE.md`
- A third-party dependency needs to be added

To escalate: add label `human-review-needed` to the issue and post a comment explaining the blocker.

---

## 9. Sprint Folder Naming

All sprint work goes into: `sprints/{YYYY-MM-DD}/issue_{XXX}/`

Required files per issue:
```
sprints/{YYYY-MM-DD}/issue_{XXX}/
├── plan.md              ← Planning Agent output
├── implementation.md    ← Dev Agent output
├── test_result.md       ← QA Agent output
├── review.md            ← Review Agent output
├── report_human.md      ← Final human-facing summary
└── report_ai.md         ← Final AI context for future agents
```
