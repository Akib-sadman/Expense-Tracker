import type { Expense } from "@/contexts/expense-context"

// Common Bangladeshi + global merchant keywords -> category value (see lib/categories.ts).
const KEYWORDS: [string, string[]][] = [
  ["transport", ["uber", "pathao", "obhai", "bus", "fuel", "petrol", "cng", "rickshaw", "metro", "train"]],
  ["food", ["cafe", "coffee", "restaurant", "pizza", "burger", "kfc", "foodpanda", "starbucks", "biryani", "kacchi", "lunch", "dinner", "breakfast"]],
  ["groceries", ["shwapno", "agora", "meena bazar", "grocery", "supermarket", "bazar", "market"]],
  ["entertainment", ["netflix", "spotify", "youtube", "cinema", "movie", "steam", "hoichoi", "bioscope"]],
  ["bills", ["desco", "dpdc", "wasa", "titas", "electric", "internet", "grameenphone", "robi", "banglalink", "airtel", "rent", "broadband"]],
  ["healthcare", ["hospital", "pharmacy", "clinic", "doctor", "medicine", "lab aid", "labaid", "square hospital"]],
  ["shopping", ["aarong", "daraz", "mall", "bata", "yellow", "apex", "amazon", "shop"]],
  ["education", ["school", "tuition", "university", "college", "course", "udemy", "book"]],
  ["travel", ["hotel", "airline", "flight", "biman", "us-bangla", "booking", "airbnb", "resort"]],
]

/**
 * Suggests a category for a payee: the category you used last time for the
 * same payee wins, then a keyword match. Returns undefined when unsure.
 */
export function suggestCategory(vendor: string, history: Pick<Expense, "vendor" | "category" | "type" | "date">[]): string | undefined {
  const v = vendor.trim().toLowerCase()
  if (v.length < 2) return undefined

  const previous = history
    .filter((e) => (e.type === "expense" || e.type === "refund") && e.vendor.trim().toLowerCase() === v)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  if (previous) return previous.category

  return KEYWORDS.find(([, words]) => words.some((w) => v.includes(w)))?.[0]
}
