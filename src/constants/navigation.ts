import { NavigationItem } from '../types/common';

export const MAIN_NAVIGATION: NavigationItem[] = [
  {
    id: 'overview',
    name: 'Analytics Overview',
    path: '/',
    icon: 'grid'
  }
];

export const DETAILED_NAVIGATION: NavigationItem[] = [
  {
    id: 'structurizr',
    name: 'Structurizr Analytics',
    path: '/structurizr',
    icon: 'layout'
  },
  {
    id: 'c4ts',
    name: 'C4TS Analytics',
    path: '/c4ts',
    icon: 'bar-chart'
  }
];

export const TIMEFRAME_OPTIONS = [
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last 90 days' },
  { value: 'year', label: 'Last 12 months' },
  { value: 'all-time', label: 'All time' }
];