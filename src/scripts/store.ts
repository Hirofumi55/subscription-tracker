import type { Subscription, AppState } from './subscriptions';

const STORAGE_KEYS = {
  APP_STATE: 'subtracker-data',
  THEME: 'subtracker-theme',
} as const;

const CURRENT_VERSION = 1;

function getDefaultState(): AppState {
  return {
    subscriptions: [],
    version: CURRENT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as AppState;
    return migrate(parsed);
  } catch {
    return getDefaultState();
  }
}

function saveState(state: AppState): void {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('subtracker:updated'));
}

function migrate(data: AppState): AppState {
  if (data.version >= CURRENT_VERSION) return data;
  // 将来のマイグレーション用プレースホルダー
  return { ...data, version: CURRENT_VERSION };
}

export const SubscriptionStore = {
  /** 全サブスク取得 */
  getAll(): Subscription[] {
    return loadState().subscriptions;
  },

  /** サブスク追加 */
  add(sub: Omit<Subscription, 'id'>): Subscription {
    const state = loadState();
    const newSub: Subscription = { ...sub, id: crypto.randomUUID() };
    state.subscriptions.push(newSub);
    saveState(state);
    return newSub;
  },

  /** サブスク更新 */
  update(id: string, updates: Partial<Subscription>): void {
    const state = loadState();
    const idx = state.subscriptions.findIndex(s => s.id === id);
    if (idx !== -1) {
      state.subscriptions[idx] = { ...state.subscriptions[idx]!, ...updates };
      saveState(state);
    }
  },

  /** サブスク削除 */
  remove(id: string): void {
    const state = loadState();
    state.subscriptions = state.subscriptions.filter(s => s.id !== id);
    saveState(state);
  },

  /** 有効/無効切替 */
  toggleActive(id: string): void {
    const state = loadState();
    const sub = state.subscriptions.find(s => s.id === id);
    if (sub) {
      sub.isActive = !sub.isActive;
      saveState(state);
    }
  },

  /** 全データエクスポート（JSON） */
  exportData(): string {
    return JSON.stringify(loadState(), null, 2);
  },

  /** データインポート（JSON） */
  importData(json: string): void {
    try {
      const parsed = JSON.parse(json) as AppState;
      if (!Array.isArray(parsed.subscriptions)) throw new Error('無効なデータ形式');
      saveState(migrate(parsed));
    } catch (e) {
      throw new Error(`インポートに失敗しました: ${e instanceof Error ? e.message : '不明なエラー'}`);
    }
  },

  /** 全データリセット */
  reset(): void {
    saveState(getDefaultState());
  },
};
