export interface AnalyticsData {
  monthly: { month: string; amount: number }[]
  weekly: { week: string; amount: number }[]
  byCategory: { name: string; value: number }[]
  byMerchant: { name: string; value: number }[]
  comparison: { category: string; current: number; previous: number }[]
}
