/**
 * ADLC Slack Slash Command Relay
 *
 * Receives /adlc slash commands from Slack and fires a
 * GitHub Actions workflow_dispatch to run the Requirement Agent.
 *
 * Deploy to Vercel (free tier).
 * Set environment variables in Vercel dashboard:
 *   SLACK_SIGNING_SECRET
 *   GITHUB_TOKEN
 *   GITHUB_OWNER
 *   GITHUB_REPO
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  // Slack sends slash command payloads as URL-encoded form data
  const params = new URLSearchParams(
    typeof req.body === 'string' ? req.body : new URLSearchParams(req.body).toString()
  );

  const channelId  = params.get('channel_id')  || '';
  const channelName = params.get('channel_name') || '';
  const userName   = params.get('user_name')   || 'someone';
  const text       = (params.get('text') || 'analyze').trim().toLowerCase();
  const subcommand = ['analyze', 'finalize'].includes(text) ? text : 'analyze';

  // ── Acknowledge Slack immediately (must respond within 3 seconds) ──
  const ackMessage = subcommand === 'finalize'
    ? `Finalizing requirements from <#${channelId}|${channelName}>... saving to repo shortly.`
    : `Analyzing the conversation in <#${channelId}|${channelName}>... will reply in about a minute.`;

  res.status(200).json({ response_type: 'in_channel', text: ackMessage });

  // ── Fire GitHub Actions workflow_dispatch (runs in background) ──
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  const url   = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/requirement-agent.yml/dispatches`;

  const ghRes = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept:         'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: { channel_id: channelId, user_name: userName, subcommand },
    }),
  });

  if (!ghRes.ok) {
    console.error('GitHub dispatch failed:', ghRes.status, await ghRes.text());
  }
}
