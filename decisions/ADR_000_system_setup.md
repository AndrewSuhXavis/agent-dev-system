# ADR 000: Agent-Driven Development System Setup

**Date**: 2026-04-07  
**Status**: Accepted  
**Deciders**: Andrew Suh

## Context

We need a software development lifecycle system that can leverage AI agents (Claude Code) to automate the majority of routine development tasks — from planning and coding to testing and review — while keeping humans in the loop for final approval.

## Decision

We will implement an Agent-Driven Lifecycle (ADLC) system with the following architecture:

1. **GitHub** as the source of truth for issues, code, and state
2. **GitHub Actions** as the workflow orchestration layer
3. **Claude Code CLI** (`@anthropic-ai/claude-code`) as the agent engine
4. **GitHub label state machine** to trigger agent pipelines
5. **Slack** as an input channel (via Slack Collector agent)
6. **MCP servers** for GitHub and Slack tool access within Claude Code

## Agent Pipeline

```
issue created → [agent:start] → Orchestrator
→ [agent:planning] → Planning Agent (creates plan + branch)
→ [agent:dev] → Dev Agents A/B/C/D (parallel, creates PRs)
→ [agent:qa] → QA Agent (tests + report)
→ [agent:review] → Review Agents x3 (parallel code review)
→ [agent:done] or [human-review-needed]
```

## Consequences

### Positive
- Dramatically reduces manual development overhead
- Consistent process enforcement via automation
- Full audit trail in GitHub (every agent action is a comment/commit)
- Humans remain in control via `human-review-needed` escalation path
- Easy to extend with new agent types via new workflow files

### Negative
- Requires GitHub Actions minutes (may incur cost at scale)
- Claude Code API costs per agent invocation
- Initial setup complexity (MCP servers, secrets, labels)
- Agents can make mistakes; QA + Review layers are critical safety nets

### Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Agent produces incorrect code | QA + 3-way review before merge |
| Runaway API costs | Set GitHub Actions concurrency limits |
| Secret exposure | All secrets in GitHub Secrets, never in code |
| Slack spam creating too many issues | Collector filters by emoji reaction 🎯 |

## Alternatives Considered

1. **LangChain/LangGraph orchestration** — More flexible but requires separate infrastructure
2. **GitHub Copilot Workspace** — Not programmable enough for multi-agent pipelines
3. **Linear + custom webhooks** — More complex integration, less native to GitHub
