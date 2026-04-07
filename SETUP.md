# Setup Guide — Agent-Centric Development System

Complete these steps in order to go live.

---

## Step 1 — Create the GitHub Repository

```bash
# On your machine, in this folder:
git init
git add .
git commit -m "Initial system scaffold"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

## Step 2 — Configure GitHub Repository Settings

In your GitHub repo settings:

### Branch Protection (Settings → Branches → Add rule for `main`)
- [ x] Require a pull request before merging
- [ x] Require 1 approving review
- [ x] Dismiss stale pull request approvals when new commits are pushed
- [ x] Require status checks to pass (add: lint, test)
- [ x] Do not allow bypassing the above settings

### Repository Variables (Settings → Secrets and variables → Actions)

Add these **Secrets**:

| Secret Name | Value | Where to get it |
|-------------|-------|-----------------|
| `ANTHROPIC_API_KEY`  | `sk-ant-...` | https://console.anthropic.com |
| `SLACK_BOT_TOKEN` | `xoxb-...` | Step 4 below |
| `SLACK_TEAM_ID` | `T0XXXXXXX` | Step 4 below |
| `SLACK_STATUS_WEBHOOK_URL` | `https://hooks.slack.com/...` | Step 4 below |

---

## Step 3 — Install GitHub Labels

```bash
# Install GitHub CLI if not already installed
brew install gh  # macOS
# or: https://cli.github.com

# Authenticate
gh auth login

# Import labels
gh label import .github/labels.yml
```

---

## Step 4 — Create Slack App

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**
2. Name: `Dev Agent Bot`, select your workspace

### OAuth Scopes (OAuth & Permissions → Bot Token Scopes)
Add these scopes:
- `channels:history`
- `channels:read`
- `users:read`
- `chat:write` (for status notifications)
- `incoming-webhook` (for status webhook)

3. Click **Install to Workspace**
4. Copy the **Bot User OAuth Token** → GitHub Secret `SLACK_BOT_TOKEN`
5. Go to **Basic Information** → copy the Workspace ID → GitHub Secret `SLACK_TEAM_ID`

### Create Incoming Webhook (for status reports)
1. In your Slack App → **Incoming Webhooks** → turn on → **Add New Webhook to Workspace**
2. Choose the channel for status reports (e.g., `#dev-status`)
3. Copy the webhook URL → GitHub Secret `SLACK_STATUS_WEBHOOK_URL`

### Invite Bot to Channels
In each Slack channel you want monitored, type:
```
/invite @Dev Agent Bot
```

### Configure Monitored Channels
Edit `scripts/slack_collector.js` and update the `MONITORED_CHANNELS` array:
```javascript
const MONITORED_CHANNELS = [
  'dev',
  'your-channel-name',
];
```

---

## Step 5 — Install Claude Code Locally

```bash
npm install -g @anthropic-ai/claude-code

# Authenticate
claude login
# Or set environment variable:
export ANTHROPIC_API_KEY=sk-ant-...
```

### Configure MCP Servers Locally

The `.mcp.json` file in the repo root configures Claude Code's MCP servers.
Set these environment variables locally:

```bash
export GITHUB_TOKEN=ghp_...      # GitHub Personal Access Token
export SLACK_BOT_TOKEN=xoxb-...  # Same as GitHub Secret above
export SLACK_TEAM_ID=T0XXXXXXX   # Same as GitHub Secret above
```

Or add to your shell profile (`~/.zshrc` or `~/.bash_profile`).

### GitHub Personal Access Token
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. **Repository access**: Select your repo
3. **Permissions**: Issues (Read & Write), Pull requests (Read & Write), Contents (Read & Write)
4. Copy token → set as `GITHUB_TOKEN` environment variable

---

## Step 6 — Fill in Project Context

Edit these files with your actual project information:

- **`context/project_definition.md`** — describe your product, architecture, and team
- **`context/shared_knowledge.md`** — add domain terminology and established patterns
- **`planning/architecture.md`** — add your current architecture diagram (Mermaid)
- **`planning/requirements.md`** ℔ add any existing requirements or roadmap items

---

## Step 7 — Adjust Cron Schedules (Optional)

Edit `.github/workflows/schedule-agent.yml` and `.github/workflows/slack-collector.yml`
to match your team's timezone:

```yaml
# Current: 9 AM UTC (= 6 PM KST for Korea Standard Time)
# For KST 9 AM, use: 0 0 * * 1-5
cron: '0 0 * * 1-5'
```

---

## Step 8 — Test the System End to End

1. Go to your GitHub repo → Issues → New Issue
2. Select **Feature Request** template
3. Fill it out and submit — it will auto-get label `agent:start`
4. Go to **Actions** tab and watch the Orchestrator workflow trigger
5. Follow the pipeline through the labels

---

## Verification Checklist

- [ ] GitHub repo created and pushed
- [ ] Branch protection rules set on `main`
- [ ] `ANTHROPIC_API_KEY` secret added
- [ ] `SLACK_BOT_TOKEN` secret added
- [ ] `SLACK_TEAM_ID` secret added
- [ ] `SLACK_STATUS_WEBHOOK_URL` secret added
- [ ] GitHub labels imported
- [ ] Slack App created with correct scopes
- [ ] Bot invited to monitored channels
- [ ] `MONITORED_CHANNELS` updated in `scripts/slack_collector.js`
- [ ] Claude Code installed locally
- [ ] MCP environment variables set locally
- [ ] `context/project_definition.md` filled in
- [ ] Test issue created and pipeline triggered successfully

---

## File Reference

```
agent-dev-system/
├── CLAUDE.md                            ← Claude Code reads this on start
├── AGENTS.md                           ← Governance constitution
├── SETUP.md                            ← This file
├── .mcp.json                           ← MCP server config for Claude Code
├── .github/
│   ├── ISSUE_TEMPLATE/
│   |   ├── feature_request.yml        ← Human issue template
│   |   └── bug_report.yml            ← Bug report template
│   ├── workflows/
│   |   ├── orchestrator.yml          ← Triggers on agent:start
│   |   ├── planning-agent.yml        ← Triggers on agent:planning
�@   |   ├── dev-agent.yml            ← Triggers on agent:dev
│   |   ├── qa-review.yml             ← Triggers on agent:qa / agent:review
│   |   ├── schedule-agent.yml        ← Daily cron status report
│   |   └── slack-collector.yml       ← Daily Slack → Issues collection
│   └── labels.yml                 ← All label definitions
├── agents/
│     ├── orchestrator.md             ← Orchestrator system prompt
│     ├── planning_agent.md          ← Planning Agent system prompt
│     ├── dev_agent.md               ← Dev Agent system prompt
│     ├── qa_agent.md                 ← QA Agent system prompt
│     ├── review_agent.md            ← Review Agent system prompt
│     └── schedule_agent.md          ← Schedule Agent system prompt
├── context/
│    ├── project_definition.md        ← ⚠ FILL THIS IN
│     ├── agent_roles.md             ← Role map and handoff rules
│     └── shared_knowledge.md        ← Domain knowledge (grow over time)
├── planning/
│    ├── requirements.md            ← High-level requirements
│    └── architecture.md            ← Architecture diagram
├── scripts/
│   ├── slack_collector.js           ← Slack message fetcher
│    └── package.json                 ← Script dependencies
├── sprints/                        ← Agent work outputs (auto-generated)
├── decisions/
│   └── ADR_000_system_setup.md        ← First architecture decision record
└── retrospectives/                 ← Monthly retrospectives
```
