import { v4 as uuidv4 } from 'uuid';
import type { EventLog, EventName } from '../types';

// In-memory store (replace with DB/Supabase in production)
const _logs: EventLog[] = [];

export const logger = {
  /**
   * Log an event and return the log entry.
   */
  log(
    event: EventName,
    contactId: string,
    status: 'success' | 'error',
    payload?: unknown,
    error?: string,
    durationMs?: number,
  ): EventLog {
    const entry: EventLog = {
      id:         uuidv4(),
      event,
      contactId,
      timestamp:  new Date().toISOString(),
      payload,
      status,
      error,
      durationMs,
    };

    _logs.push(entry);

    // Keep last 1000 events in memory
    if (_logs.length > 1000) _logs.splice(0, _logs.length - 1000);

    const icon = status === 'success' ? '✅' : '❌';
    const dur  = durationMs != null ? ` (${durationMs}ms)` : '';
    console.log(`${icon} [${event}] contactId=${contactId}${dur}${error ? ` err=${error}` : ''}`);

    return entry;
  },

  success(event: EventName, contactId: string, payload?: unknown, durationMs?: number): EventLog {
    return this.log(event, contactId, 'success', payload, undefined, durationMs);
  },

  error(event: EventName, contactId: string, error: unknown, payload?: unknown): EventLog {
    const msg = error instanceof Error ? error.message : String(error);
    return this.log(event, contactId, 'error', payload, msg);
  },

  /**
   * Wrap an async operation: logs success/error automatically and tracks duration.
   */
  async track<T>(
    event: EventName,
    contactId: string,
    fn: () => Promise<T>,
    payload?: unknown,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.success(event, contactId, payload, Date.now() - start);
      return result;
    } catch (err) {
      this.error(event, contactId, err, payload);
      throw err;
    }
  },

  /** Return all logs, newest first */
  getAll(limit = 100): EventLog[] {
    return [..._logs].reverse().slice(0, limit);
  },

  /** Filter logs by contactId */
  forContact(contactId: string): EventLog[] {
    return _logs.filter(l => l.contactId === contactId).reverse();
  },

  /** Filter logs by event type */
  byEvent(event: EventName, limit = 50): EventLog[] {
    return _logs.filter(l => l.event === event).reverse().slice(0, limit);
  },

  /** Stats */
  stats() {
    const total   = _logs.length;
    const success = _logs.filter(l => l.status === 'success').length;
    const errors  = total - success;
    const byEvent: Record<string, number> = {};
    for (const l of _logs) {
      byEvent[l.event] = (byEvent[l.event] || 0) + 1;
    }
    return { total, success, errors, byEvent };
  },
};
