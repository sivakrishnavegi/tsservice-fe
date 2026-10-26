/** Short random id for local rows (not security sensitive). */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
