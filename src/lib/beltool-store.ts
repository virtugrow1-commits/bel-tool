// localStorage wrapper for BelTool
export const store = {
  get<T>(key: string, defaultVal: T): T {
    try {
      const v = localStorage.getItem('cq_' + key);
      return v ? JSON.parse(v) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem('cq_' + key, JSON.stringify(value));
    } catch {}
  },
  del(key: string): void {
    try {
      localStorage.removeItem('cq_' + key);
    } catch {}
  },
};
