#!/usr/bin/env node
/**
 * Slack Collector Agent
 * 
 * Fetches messages from configured Slack channels that have been
 * reacted with 🎯 (target emoji) and creates GitHub Issues for them.
 * 
 * Required environment variables:
 *   SLACK_BOT_TOKEN   - Slack Bot OAuth token (xoxb-...)
 *   GITHUB_TOKEN      - GitHub PAT with repo scope
 *   GITHUB_OWNER      - GitHub repo owner (e.g. AndrewSuhXavis)
 *   GITHUB_REPO       - GitHub repo name (e.g. agent-dev-system)
 *   SLACK_CHANNEL_IDS - Comma-separated Slack channel IDs to monitor
 */

const { WebClient } = require('@slack/web-api');

const REACTION_TRIGGER = 'dart'; // 🎯 emoji name in Slack API
const LOOKBACK_HOURS = 24;

async function main() {
  const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
  
  const channelIds = (process.env.SLACK_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (channelIds.length === 0) {
    console.error('No SLACK_CHANNEL_IDS configured');
    process.exit(1);
  }

  const oldest = (Date.now() / 1000 - LOOKBACK_HOURS * 3600).toString();
  const issues = [];

  for (const channelId of channelIds) {
    console.log(`Scanning channel ${channelId}...`);
    
    let cursor;
    do {
      const result = await slack.conversations.history({
        channel: channelId,
        oldest,
        limit: 200,
        cursor,
      });

      for (const msg of result.messages || []) {
        const reactions = msg.reactions || [];
        const hasTrigger = reactions.some(r => r.name === REACTION_TRIGGER);
        if (!hasTrigger) continue;

        // Get permalink for reference
        const permalink = await slack.chat.getPermalink({
          channel: channelId,
          message_ts: msg.ts,
        });

        issues.push({
          title: truncate(msg.text, 80),
          body: buildIssueBody(msg, permalink.permalink, channelId),
        });
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);
  }

  console.log(`Found ${issues.length} messages to create issues for`);

  for (const issue of issues) {
    await createGitHubIssue(issue.title, issue.body);
    // Rate limit
    await sleep(500);
  }
}

function buildIssueBody(msg, permalink, channelId) {
  const ts = new Date(parseFloat(msg.ts) * 1000).toISOString();
  return `## Slack Message

**Source**: Slack channel \`${channelId}\`  
**Posted**: ${ts}  
**Link**: ${permalink}

---

${msg.text}

---

*This issue was automatically created by the Slack Collector Agent.*  
*Labels: \`from-slack\`, \`agent:start\`*`;
}

async function createGitHubIssue(title, body) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      labels: ['from-slack', 'agent:start'],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${err}`);
  }

  const created = await response.json();
  console.log(`Created issue #${created.number}: ${title}`);
  return created;
}

function truncate(str, maxLen) {
  if (!str) return '(no text)';
  const clean = str.replace(/\n+/g, ' ').trim();
  return clean.length > maxLen ? clean.substring(0, maxLen - 3) + '...' : clean;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('Slack collector failed:', err);
  process.exit(1);
});
