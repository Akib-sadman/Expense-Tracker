export function getCurrencySymbol(code?: string): string {
  const symbols: Record<string, string> = {
    BDT: "৳", USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CAD: "C$", AUD: "A$",
  }
  if (!code) return "৳"
  return symbols[code] || code
}

/**
 * Formats a money amount with the sign in front of the symbol and a real minus
 * sign, so negatives read "−৳890" everywhere instead of a mix of "৳-890" and "-৳890".
 */
export function formatMoney(amount: number, symbol: string, opts: { showPlus?: boolean } = {}): string {
  const rounded = Math.round(amount)
  const body = `${symbol}${Math.abs(rounded).toLocaleString()}`
  if (rounded < 0) return `\u2212${body}`
  if (rounded > 0 && opts.showPlus) return `+${body}`
  return body
}
