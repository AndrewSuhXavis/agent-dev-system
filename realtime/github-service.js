/**
 * GitHubService
 *
 * Creates GitHub Issues with the correct labels to kick off the ADLC pipeline.
 */

class GitHubService {
  constructor(token, owner, repo) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  async createIssue(title, body) {
    const res = await fetch(`${this.baseUrl}/issues`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        title,
        body,
        labels: ['from-slack', 'agent:start'],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub API ${res.status}: ${err}`);
    }

    return res.json();
  }

  async postComment(issueNumber, body) {
    const res = await fetch(`${this.baseUrl}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ body }),
    });

    if (!res.ok) throw new Error(`Comment failed: ${res.status}`);
    return res.json();
  }
}

module.exports = { GitHubService };
