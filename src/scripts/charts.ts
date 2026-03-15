import type { Chart as ChartType, ChartConfiguration } from 'chart.js';
import type { Subscription, SubscriptionCategory } from './subscriptions';
import { CATEGORIES, toMonthly } from './subscriptions';

// Chart.jsはクライアントサイドのみ
let Chart: typeof ChartType | undefined;

async function loadChart() {
  if (Chart) return Chart;
  const module = await import('chart.js');
  module.Chart.register(
    module.DoughnutController,
    module.BarController,
    module.ArcElement,
    module.BarElement,
    module.CategoryScale,
    module.LinearScale,
    module.Tooltip,
    module.Legend,
  );
  Chart = module.Chart;
  return Chart;
}

let categoryChartInstance: ChartType<'doughnut'> | undefined;
let monthlyChartInstance: ChartType<'bar'> | undefined;

function isDark(): boolean {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

function chartColors() {
  return {
    text: isDark() ? '#86868B' : '#6E6E73',
    border: isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    tooltipBg: isDark() ? '#1C1C1E' : '#F5F5F7',
    tooltipText: isDark() ? '#F5F5F7' : '#1D1D1F',
  };
}

export async function initCategoryChart(canvas: HTMLCanvasElement, subscriptions: Subscription[]): Promise<void> {
  const ChartClass = await loadChart();

  const active = subscriptions.filter(s => s.isActive);
  const byCategory = new Map<SubscriptionCategory, number>();
  for (const sub of active) {
    const cat = sub.category;
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + toMonthly(sub));
  }

  const labels: string[] = [];
  const data: number[] = [];
  const colors: string[] = [];
  for (const [cat, amount] of byCategory) {
    if (amount > 0) {
      labels.push(CATEGORIES[cat].label);
      data.push(amount);
      colors.push(CATEGORIES[cat].color);
    }
  }

  const c = chartColors();
  const total = data.reduce((a, b) => a + b, 0);

  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: c.text, padding: 16, font: { size: 12 }, boxWidth: 12, borderRadius: 4 },
        },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: c.tooltipText,
          bodyColor: c.tooltipText,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed as number;
              const pct = total > 0 ? Math.round(val / total * 100) : 0;
              return ` ¥${val.toLocaleString('ja-JP')} (${pct}%)`;
            },
          },
        },
      },
    },
  };

  if (categoryChartInstance) {
    categoryChartInstance.data = config.data;
    categoryChartInstance.update('active');
  } else {
    categoryChartInstance = new ChartClass(canvas, config) as ChartType<'doughnut'>;
  }
}

export async function initMonthlyChart(canvas: HTMLCanvasElement, subscriptions: Subscription[]): Promise<void> {
  const ChartClass = await loadChart();

  const active = subscriptions.filter(s => s.isActive);
  const months: string[] = [];
  const values: number[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(label);

    let total = 0;
    for (const sub of active) {
      const start = new Date(sub.startDate);
      if (start <= new Date(d.getFullYear(), d.getMonth() + 1, 0)) {
        total += toMonthly(sub);
      }
    }
    values.push(total);
  }

  const c = chartColors();
  const currentMonthIndex = 11;
  const bgColors = months.map((_, i) =>
    i === currentMonthIndex ? '#2997FF' : (isDark() ? 'rgba(41,151,255,0.35)' : 'rgba(0,113,227,0.25)')
  );

  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: '月額合計',
        data: values,
        backgroundColor: bgColors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: c.tooltipText,
          bodyColor: c.tooltipText,
          callbacks: {
            label: (ctx) => ` ¥${(ctx.parsed.y as number).toLocaleString('ja-JP')}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: c.text, font: { size: 11 } },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          ticks: {
            color: c.text,
            font: { size: 11 },
            callback: (v) => `¥${Number(v).toLocaleString('ja-JP')}`,
          },
          grid: { color: c.border },
          border: { display: false },
        },
      },
    },
  };

  if (monthlyChartInstance) {
    monthlyChartInstance.data = config.data;
    monthlyChartInstance.update('active');
  } else {
    monthlyChartInstance = new ChartClass(canvas, config) as ChartType<'bar'>;
  }
}

export function updateChartTheme(): void {
  [categoryChartInstance, monthlyChartInstance].forEach(chart => {
    if (chart) chart.update();
  });
}

export function destroyCharts(): void {
  categoryChartInstance?.destroy();
  monthlyChartInstance?.destroy();
  categoryChartInstance = undefined;
  monthlyChartInstance = undefined;
}
