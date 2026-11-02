import type { RankingCategory, RankingPeriod } from '../types';
import { formatDollars } from '../utils/format';

export const CATEGORY_LABELS: Record<RankingCategory, string> = {
  gifted: 'Most Gifted',
  helped: 'Most Helped',
};

export const PERIOD_LABELS: Record<RankingPeriod, string> = {
  monthly: 'Monthly',
  overall: 'Overall',
};

export function describeBoard(category: RankingCategory, period: RankingPeriod) {
  const when = period === 'monthly' ? 'this month' : 'overall';
  return category === 'gifted'
    ? `People who have gifted the most ${when}`
    : `People who have helped the most people ${when}`;
}

/** "$210 gifted" or "18 people helped". */
export function formatMetric(category: RankingCategory, value: number) {
  if (category === 'gifted') return `${formatDollars(value)} gifted`;
  return `${value} ${value === 1 ? 'person' : 'people'} helped`;
}
