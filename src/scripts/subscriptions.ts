/** サブスクリプションのカテゴリ */
export type SubscriptionCategory =
  | 'video'
  | 'music'
  | 'ai'
  | 'cloud'
  | 'productivity'
  | 'gaming'
  | 'news'
  | 'fitness'
  | 'other';

/** 支払い周期 */
export type BillingCycle = 'monthly' | 'yearly';

/** サブスクリプション */
export interface Subscription {
  id: string;
  name: string;
  price: number;
  billingCycle: BillingCycle;
  category: SubscriptionCategory;
  startDate: string;
  icon: string;
  color: string;
  isPreset: boolean;
  isActive: boolean;
  memo?: string;
}

/** localStorage保存形式 */
export interface AppState {
  subscriptions: Subscription[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES: Record<SubscriptionCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  video:        { label: '動画配信',     icon: 'play-circle',  color: '#E50914' },
  music:        { label: '音楽配信',     icon: 'music',        color: '#1DB954' },
  ai:           { label: 'AI・生成AI',   icon: 'brain',        color: '#8B5CF6' },
  cloud:        { label: 'クラウド',     icon: 'cloud',        color: '#0EA5E9' },
  productivity: { label: '仕事効率化',   icon: 'briefcase',    color: '#F59E0B' },
  gaming:       { label: 'ゲーム',       icon: 'gamepad-2',    color: '#10B981' },
  news:         { label: 'ニュース',     icon: 'newspaper',    color: '#6366F1' },
  fitness:      { label: 'フィットネス', icon: 'dumbbell',     color: '#EC4899' },
  other:        { label: 'その他',       icon: 'package',      color: '#71717A' },
};

/** 月額換算（年額サブスクは÷12） */
export function toMonthly(sub: Subscription): number {
  return sub.billingCycle === 'yearly'
    ? Math.round(sub.price / 12)
    : sub.price;
}

/** 年額換算（月額サブスクは×12） */
export function toYearly(sub: Subscription): number {
  return sub.billingCycle === 'monthly'
    ? sub.price * 12
    : sub.price;
}

/** 累計支出（開始日から今日までの月数 × 月額換算） */
export function totalSpent(sub: Subscription): number {
  const start = new Date(sub.startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12
               + (now.getMonth() - start.getMonth());
  return Math.max(0, months) * toMonthly(sub);
}

/** 通貨フォーマット */
export function formatJPY(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}
