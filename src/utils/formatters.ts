export function formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }
  
  export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
  
  export function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  }
  
  export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
  
  export function formatTrend(value: number): string {
    if (value > 0) {
      return `+${formatPercentage(value)}`;
    }
    return formatPercentage(value);
  }