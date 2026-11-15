
export interface SubcategoryOption {
  value: string
  label: string
}

export interface CategoryOption {
  value: string
  label: string
  icon: string
  subcategories: SubcategoryOption[]
}

function label(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function subcats(values: string[]): SubcategoryOption[] {
  return values.map((value) => ({ value, label: label(value) }))
}

export const CATEGORIES: CategoryOption[] = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️', subcategories: subcats(['dining_out', 'coffee_shops', 'fast_food', 'delivery', 'other']) },
  { value: 'transport', label: 'Transportation', icon: '🚗', subcategories: subcats(['fuel', 'public_transit', 'rideshare', 'parking', 'maintenance', 'other']) },
  { value: 'bills', label: 'Bills & Utilities', icon: '📄', subcategories: subcats(['electricity', 'water', 'gas', 'internet', 'phone', 'rent', 'other']) },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', subcategories: subcats(['clothing', 'electronics', 'home_goods', 'personal_care', 'other']) },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬', subcategories: subcats(['movies', 'streaming', 'games', 'events', 'other']) },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥', subcategories: subcats(['doctor', 'pharmacy', 'dental', 'insurance', 'other']) },
  { value: 'education', label: 'Education', icon: '📚', subcategories: subcats(['tuition', 'books', 'courses', 'supplies', 'other']) },
  { value: 'travel', label: 'Travel', icon: '✈️', subcategories: subcats(['flights', 'hotels', 'transportation_costs', 'activities', 'other']) },
  { value: 'groceries', label: 'Groceries', icon: '🛒', subcategories: subcats(['supermarket', 'local_market', 'other']) },
  { value: 'other', label: 'Other', icon: '📦', subcategories: subcats(['other']) },
]

export function categoryColor(value: string): string {
  return `hsl(var(--cat-${CATEGORIES.some((c) => c.value === value) ? value : 'other'}))`
}

export function getCategory(value: string): CategoryOption | undefined {
  return CATEGORIES.find((c) => c.value === value)
}

export const PAYMENT_METHODS: SubcategoryOption[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_wallet', label: 'Mobile Wallet' },
  { value: 'other', label: 'Other' },
]

// Income doesn't use the spending categories: the backend files it under
// "other" with one of these sources as its subcategory.
export const INCOME_CATEGORY = 'other'

export const INCOME_SOURCES: (SubcategoryOption & { icon: string })[] = [
  { value: 'salary', label: 'Salary', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '🧑‍💻' },
  { value: 'business', label: 'Business', icon: '🏪' },
  { value: 'investments', label: 'Investments', icon: '📈' },
  { value: 'gifts', label: 'Gifts', icon: '🎁' },
  { value: 'rental', label: 'Rental', icon: '🏠' },
  { value: 'other_income', label: 'Other income', icon: '💰' },
]

export function getSubcategoryLabel(category: string, subcategory?: string | null): string | undefined {
  if (!subcategory) return undefined
  return (
    getCategory(category)?.subcategories.find((s) => s.value === subcategory)?.label ||
    INCOME_SOURCES.find((s) => s.value === subcategory)?.label ||
    label(subcategory)
  )
}
