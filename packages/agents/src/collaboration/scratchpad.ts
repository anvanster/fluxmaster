export class ScratchpadManager {
  private store = new Map<string, Map<string, string>>();

  set(conversationId: string, key: string, value: string): void {
    if (!this.store.has(conversationId)) {
      this.store.set(conversationId, new Map());
    }
    this.store.get(conversationId)!.set(key, value);
  }

  get(conversationId: string, key: string): string | undefined {
    return this.store.get(conversationId)?.get(key);
  }

  list(conversationId: string): Array<{ key: string; value: string }> {
    const map = this.store.get(conversationId);
    if (!map) return [];
    return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
  }

  delete(conversationId: string, key: string): boolean {
    return this.store.get(conversationId)?.delete(key) ?? false;
  }

  clear(conversationId: string): void {
    this.store.delete(conversationId);
  }
}
