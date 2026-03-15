import type { Subscription, AppState } from './subscriptions';

const STORAGE_KEYS = {
  APP_STATE: 'subtracker-data',
  THEME: 'subtracker-theme',
} as const;

const CURRENT_VERSION = 2;

// v1→v2: icon フィールドを /brand/xxx.svg パスへ移行
const NAME_TO_ICON: Record<string, string> = {
  'Netflix（スタンダード）':    '/brand/netflix.svg',
  'Netflix（プレミアム）':      '/brand/netflix.svg',
  'Amazon Prime':               '/brand/amazon-prime.svg',
  'Disney+（スタンダード）':    '/brand/disney-plus.svg',
  'YouTube Premium':            '/brand/youtube.svg',
  'Hulu':                       '/brand/hulu.svg',
  'U-NEXT':                     '/brand/unext.svg',
  'Apple TV+':                  '/brand/apple.svg',
  'Spotify Premium':            '/brand/spotify.svg',
  'Apple Music':                '/brand/apple-music.svg',
  'Amazon Music Unlimited':     '/brand/amazon-music.svg',
  'YouTube Music Premium':      '/brand/youtube-music.svg',
  'Claude Pro':                 '/brand/claude.svg',
  'Claude Max 5x':              '/brand/claude.svg',
  'Claude Max 20x':             '/brand/claude.svg',
  'ChatGPT Go':                 '/brand/chatgpt.svg',
  'ChatGPT Plus':               '/brand/chatgpt.svg',
  'ChatGPT Pro':                '/brand/chatgpt.svg',
  'Google AI Pro':              '/brand/google-ai.svg',
  'Google AI Ultra':            '/brand/google-ai.svg',
  'GitHub Copilot':             '/brand/github-copilot.svg',
  'Perplexity Pro':             '/brand/perplexity.svg',
  'iCloud+（200GB）':           '/brand/icloud.svg',
  'iCloud+（2TB）':             '/brand/icloud.svg',
  'Google One（100GB）':        '/brand/google-one.svg',
  'Google One（2TB）':          '/brand/google-one.svg',
  'Dropbox Plus':               '/brand/dropbox.svg',
  'Microsoft 365 Personal':     '/brand/microsoft.svg',
  'Notion Plus':                '/brand/notion.svg',
  'Adobe Creative Cloud':       '/brand/adobe.svg',
  'Nintendo Switch Online':     '/brand/nintendo.svg',
  'PS Plus Essential':          '/brand/playstation.svg',
  'Xbox Game Pass Core':        '/brand/xbox.svg',
  '日経電子版':                  '/brand/nikkei.svg',
  'NewsPicks':                  '/brand/newspicks.svg',
  'Audible':                    '/brand/audible.svg',
  'chocoZAP（チョコザップ）':   '/brand/chocozap.svg',
  'エニタイムフィットネス':      '/brand/anytime.svg',
  'JOYFIT24':                   '/brand/joyfit.svg',
  'FIT PLACE24':                '/brand/fitplace.svg',
  'ゴールドジム':                '/brand/gold-gym.svg',
};

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
  let state = { ...data };

  // v1 → v2: icon フィールドを /brand/xxx.svg パスへ更新
  if (state.version < 2) {
    state = {
      ...state,
      version: 2,
      subscriptions: state.subscriptions.map(sub => ({
        ...sub,
        icon: NAME_TO_ICON[sub.name]
          ?? (sub.icon.startsWith('/brand/') ? sub.icon : `/brand/category-${sub.category}.svg`),
      })),
    };
    // マイグレーション結果を即座に保存
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString(),
    }));
  }

  return state;
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
