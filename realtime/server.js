/**
 * ADLC Real-time Conversation Server
 *
 * Enables free-flowing 3-way conversations between team members,
 * colleagues, and the ADLC agent directly inside Slack.
 *
 * Flow:
 *   @@DLC Bot mentioned or DM → agent replies in real-time
 *   Team keeps chatting → agent maintains full thread context
 *   Someone reacts 🎯 → agent summarizes requirements → creates GitHub Issue → ADLC pipeline starts
 *
 * Required environment variables (set in Railway/Render or .env):
 *   SLACK_BOT_TOKEN         - xoxb-... (Bot OAuth token)
 *   SLACK_SIGNING_SECRET    - From Slack App > Basic Information
 *   SLACK_APP_TOKEN         - xapp-... (for Socket Mode, optional)
 *   ANTHROPIC_API_KEY       - Your Anthropic API key
 *   GITHUB_TOKEN            - PAT with repo scope
 *   GITHUB_OWNER            - e.g. AndrewSuhXavis
 *   GITHUB_REPO             - e.g. agent-dev-system
 *   PORT                    - (default: 3000)
 */

require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { ConversationStore } = require('./conversation-store');
const { GitHubService } = require('./github-service');

// ── Clients ──────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const store = new ConversationStore();
const github = new GitHubService(
  process.env.GITHUB_TOKEN,
  process.env.GITHUB_OWNER,
  process.env.GITHUB_REPO
);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// ── System prompt for the requirements analyst agent ──────
const SYSTEM_PROMPT = `You are ADLC Bot, an AI requirements analyst embedded in a Slack workspace.
You participate in real-time conversations with product managers, developers, designers, and QA engineers.

Your role:
1. LISTEN to the team's discussion and understand what they want to build
2. ASK clarifying questions when requirements are ambiguous or incomplete
3. SUMMARIZE key decisions as they emerge during the conversation
4. IDENTIFY conflicts or gaps in requirements and surface them politely
5. When the team finalizes requirements (someone reacts 🎯 or says "let's go"), produce a structured requirements summary

Conversation style:
- Be concise — this is Slack, not a document editor
- Be collaborative — you are one of the team, not an authority
- Ask one or two questions at a time, not a long list
- Use bullet points sparingly; prefer natural language
- If you are unsure about something, say so and ask

Do NOT start writing code or implementation plans here. Your job is requirements clarity only.
Once requirements are finalized, you will create a GitHub Issue and hand off to the development pipeline.

Current team context: you are working on the project in the GitHub repository ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}.`;

// ── Helper: call Claude with full thread context ──────────
async function askClaude(threadMessages, newUserMessage, userName) {
  // Build message history from the stored thread
  const history = threadMessages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Append the new message
  history.push({
    role: 'user',
    content: `[${userName}]: ${newUserMessage}`,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  return response.content[0].text;
}

// ── Event: app_mention — someone @mentions the bot ───────
app.event('app_mention', async ({ event, client, say }) => {
  const threadTs = event.thread_ts || event.ts;
  const channelId = event.channel;
  const contextKey = `${channelId}:${threadTs}`;

  try {
    // Get the user's display name
    const userInfo = await client.users.info({ user: event.user });
    const userName = userInfo.user.real_name || userInfo.user.name;

    // Strip the bot mention from the text
    const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

    // Load existing conversation context for this thread
    const history = store.get(contextKey);

    // Get Claude's response
    const reply = await askClaude(history, text, userName);

    // Store the new exchange
    store.addExchange(contextKey, {
      role: 'user',
      content: `[${userName}]: ${text}`,
    }, {
      role: 'assistant',
      content: reply,
    });

    // Reply in the same thread
    await say({
      text: reply,
      thread_ts: threadTs,
    });

  } catch (err) {
    console.error('app_mention error:', err);
    await say({
      text: `Sorry, I ran into an error: ${err.message}`,
      thread_ts: threadTs,
    });
  }
});

// ── Event: message in channel (non-mention, thread replies) ─
app.event('message', async ({ event, client, say }) => {
  // Only handle threaded replies where the bot has already participated
  if (!event.thread_ts || event.bot_id || event.subtype) return;

  const threadTs = event.thread_ts;
  const channelId = event.channel;
  const contextKey = `${channelId}:${threadTs}`;

  // Only respond if bot is already in this conversation
  if (!store.has(contextKey)) return;

  try {
    const userInfo = await client.users.info({ user: event.user });
    const userName = userInfo.user.real_name || userInfo.user.name;
    const text = event.text?.trim();
    if (!text) return;

    const history = store.get(contextKey);

    // Store the human message (even if bot won't reply — keeps context)
    store.addMessage(contextKey, { role: 'user', content: `[${userName}]: ${text}` });

    // Only auto-respond if the message seems to be directed at the bot
    // (contains a question, or is a short reply in an active thread)
    const isQuestion = text.includes('?') || text.length < 120;
    if (!isQuestion) return;

    const reply = await askClaude(history, text, userName);

    store.addMessage(contextKey, { role: 'assistant', content: reply });

    await say({
      text: reply,
      thread_ts: threadTs,
    });

  } catch (err) {
    console.error('message event error:', err);
  }
});

// ── Event: reaction_added — 🎯 triggers requirements handoff ─
app.event('reaction_added', async ({ event, client }) => {
  if (event.reaction !== 'dart') return; // 🎯 emoji

  const channelId = event.item.channel;
  const messageTs = event.item.ts;

  try {
    // Get the original message
    const result = await client.conversations.replies({
      channel: channelId,
      ts: messageTs,
      limit: 200,
    });

    const thread = result.messages || [];
    const threadTs = thread[0]?.ts || messageTs;
    const contextKey = `${channelId}:${threadTs}`;

    // Notify the channel that we're processing
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: `🎯 Got it! Let me summarize the requirements from our conversation and create a GitHub Issue...`,
    });

    // Build a transcript of the thread for final summarization
    const transcript = thread
      .filter(m => !m.bot_id)
      .map(m => `${m.user || 'unknown'}: ${m.text}`)
      .join('\n');

    // Ask Claude to produce a final structured requirements summary
    const summary = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `The team has finalized the requirements. Here is the full Slack conversation:\n\n${transcript}\n\nPlease produce a structured GitHub Issue body in markdown with these sections:\n## Overview\n## Confirmed Requirements\n## Out of Scope\n## Open Questions (if any)\n## Design References (if mentioned)\n\nAlso provide a concise issue title (max 80 chars).`,
        },
      ],
    });

    const summaryText = summary.content[0].text;

    // Extract title (first line) and body (rest)
    const lines = summaryText.trim().split('\n');
    let title = lines[0].replace(/^#+\s*/, '').replace(/^Title:\s*/i, '').trim();
    if (title.length > 80) title = title.substring(0, 77) + '...';
    const body = lines.slice(1).join('\n').trim() +
      `\n\n---\n*Auto-generated from Slack thread by ADLC Bot*\n*Channel: <#${channelId}> · Thread: ${new Date(parseFloat(threadTs) * 1000).toISOString()}*`;

    // Create GitHub Issue
    const issue = await github.createIssue(title, body);

    // Post the result back to Slack
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: `✅ GitHub Issue created and development pipeline started!\n\n*#${issue.number}: ${issue.title}*\n${issue.html_url}\n\nThe agent pipeline is now running: Orchestrator → Planning → Dev → QA → Review. I'll update you here when it's done.`,
    });

    // Clear the conversation context
    store.delete(contextKey);

  } catch (err) {
    console.error('reaction_added error:', err);
    await client.chat.postMessage({
      channel: channelId,
      text: `❌ Failed to create GitHub issue: ${err.message}`,
    });
  }
});

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
receiver.app.get('/health', (_, res) => res.json({ status: 'ok' }));

(async () => {
  await app.start(PORT);
  console.log(`⚡ ADLC Real-time Bot is running on port ${PORT}`);
})();
