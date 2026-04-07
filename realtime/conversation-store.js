/**
 * ConversationStore
 *
 * Keeps thread conversation history in memory so Claude has full context
 * for each ongoing Slack thread.
 *
 * Key format: "{channelId}:{threadTs}"
 * Each entry: array of { role: 'user' | 'assistant', content: string }
 *
 * For production, swap the Map for Redis:
 *   npm install ioredis
 *   and replace Map operations with redis.get/set with TTL
 */

const MAX_MESSAGES = 100;   // max messages per thread
const TTL_MS = 24 * 60 * 60 * 1000; // auto-expire threads after 24h

class ConversationStore {
  constructor() {
    this._store = new Map();   // key → { messages, expiresAt }
    this._startCleanup();
  }

  has(key) {
    const entry = this._store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return false;
    }
    return true;
  }

  get(key) {
    if (!this.has(key)) return [];
    return this._store.get(key).messages;
  }

  addMessage(key, message) {
    if (!this.has(key)) {
      this._store.set(key, { messages: [], expiresAt: Date.now() + TTL_MS });
    }
    const entry = this._store.get(key);
    entry.messages.push(message);
    entry.expiresAt = Date.now() + TTL_MS; // refresh TTL on activity

    // Trim to max size (keep most recent messages)
    if (entry.messages.length > MAX_MESSAGES) {
      entry.messages = entry.messages.slice(-MAX_MESSAGES);
    }
  }

  addExchange(key, userMessage, assistantMessage) {
    this.addMessage(key, userMessage);
    this.addMessage(key, assistantMessage);
  }

  delete(key) {
    this._store.delete(key);
  }

  // Periodically remove expired threads
  _startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this._store) {
        if (now > entry.expiresAt) this._store.delete(key);
      }
    }, 60 * 60 * 1000); // run every hour
  }
}

module.exports = { ConversationStore };
