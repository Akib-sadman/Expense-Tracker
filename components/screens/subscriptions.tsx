"use client"

import { useEffect, useState } from "react"
import { Plus, RotateCcw, Trash2, Edit, CheckCircle, Sparkles, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useSubscriptions, type Subscription, type BillingCycle, type DetectedRecurringCharge } from "@/contexts/subscriptions-context"
import { useAuth } from "@/contexts/auth-context"
import { CATEGORIES, getCategory } from "@/lib/categories"
import { getCurrencySymbol } from "@/lib/currency"
import { hoverLift } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface FormState {
  name: string
  provider: string
  category: string
  amount: string
  billingCycle: BillingCycle
  nextBillingDate: string
}

const EMPTY_FORM: FormState = { name: "", provider: "", category: "entertainment", amount: "", billingCycle: "monthly", nextBillingDate: "" }

export default function Subscriptions() {
  const { state, reloadSubscriptions, createSubscription, updateSubscription, deleteSubscription, paySubscription, undoSubscriptionPayment, fetchDetectedCharges } = useSubscriptions()
  const { state: authState } = useAuth()
  const currencySymbol = getCurrencySymbol(authState.user?.preferences.currency)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [togglingSubId, setTogglingSubId] = useState<string | null>(null)

  const [detected, setDetected] = useState<DetectedRecurringCharge[] | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDetectedCharges().then((res) => {
      if (res.success && res.data) setDetected(res.data)
    })
  }, [])

  const openCreate = (prefill?: DetectedRecurringCharge) => {
    setEditingSub(null)
    setForm(
      prefill
        ? {
            name: prefill.vendor,
            provider: prefill.vendor,
            category: prefill.category,
            amount: String(prefill.amount),
            billingCycle: prefill.billingCycle,
            nextBillingDate: prefill.suggestedNextBillingDate,
          }
        : EMPTY_FORM
    )
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (sub: Subscription) => {
    setEditingSub(sub)
    setForm({
      name: sub.name,
      provider: sub.provider ?? "",
      category: sub.category,
      amount: String(sub.amount),
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    const amount = Number.parseFloat(form.amount)
    if (!form.name.trim()) return setFormError("Name is required.")
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Amount must be greater than 0.")
    if (!form.nextBillingDate) return setFormError("Next billing date is required.")

    setSaving(true)
    setFormError(null)
    const result = editingSub
      ? await updateSubscription(editingSub.id, {
          name: form.name.trim(),
          provider: form.provider.trim() || null,
          category: form.category,
          amount,
          billingCycle: form.billingCycle,
          nextBillingDate: form.nextBillingDate,
        })
      : await createSubscription({
          name: form.name.trim(),
          provider: form.provider.trim() || undefined,
          category: form.category,
          amount,
          billingCycle: form.billingCycle,
          nextBillingDate: form.nextBillingDate,
        })
    setSaving(false)
    if (!result.success) return setFormError(result.error || "Could not save subscription.")
    setDialogOpen(false)
    fetchDetectedCharges().then((res) => res.success && res.data && setDetected(res.data))
  }

  const handleDelete = async (sub: Subscription) => {
    setActionError(null)
    const result = await deleteSubscription(sub.id)
    if (!result.success) setActionError(result.error || "Could not delete subscription.")
  }

  const handleTogglePaid = async (sub: Subscription) => {
    if (togglingSubId) return
    setActionError(null)
    setTogglingSubId(sub.id)
    try {
      const result = sub.paidForCurrentCycle ? await undoSubscriptionPayment(sub.id) : await paySubscription(sub.id)
      if (!result.success) setActionError(result.error || "Could not update payment status.")
    } finally {
      setTogglingSubId(null)
    }
  }

  const visibleDetected = (detected ?? []).filter((c) => !dismissed.has(`${c.vendor}|${c.amount}`))
  const isNewUser = state.subscriptions.length === 0 && !state.isLoading && !state.loadError

  return (
    <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="hidden sm:block text-muted-foreground">Recurring charges, renewal dates, and payment tracking.</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openCreate()} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subscription
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSub ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {formError && (
                    <Alert className="border-red-500/30 bg-red-500/10">
                      <AlertDescription className="text-red-700 dark:text-red-300">{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="sub-name">Name</Label>
                    <Input id="sub-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Netflix" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-provider">Provider (optional)</Label>
                    <Input id="sub-provider" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-category">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger id="sub-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.icon} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-amount">Amount</Label>
                    <Input id="sub-amount" type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-billing-cycle">Billing cycle</Label>
                    <Select value={form.billingCycle} onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v as BillingCycle }))}>
                      <SelectTrigger id="sub-billing-cycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-next-date">Next billing date</Label>
                    <Input
                      id="sub-next-date"
                      type="date"
                      value={form.nextBillingDate}
                      onChange={(e) => setForm((f) => ({ ...f, nextBillingDate: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving..." : editingSub ? "Save changes" : "Add subscription"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {actionError && (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertDescription className="text-red-700 dark:text-red-300">{actionError}</AlertDescription>
            </Alert>
          )}

          {visibleDetected.length > 0 && (
            <Alert className="border-primary/30 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertTitle className="text-foreground">Possible recurring charges found in your transaction history</AlertTitle>
              <AlertDescription className="text-foreground">
                <div className="space-y-2 mt-2">
                  {visibleDetected.map((c) => (
                    <div key={`${c.vendor}|${c.amount}`} className="flex items-center justify-between gap-3 bg-card border border-border px-3 py-2">
                      <span className="text-sm">
                        <strong>{c.vendor}</strong> - {currencySymbol}
                        {c.amount.toLocaleString()} ({c.billingCycle}, seen {c.occurrenceCount}x, last {c.lastOccurrenceDate})
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openCreate(c)}>
                          Track it
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDismissed((d) => new Set(d).add(`${c.vendor}|${c.amount}`))}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {}
          {state.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading subscriptions...
            </div>
          ) : state.loadError ? (
            <Card>
              <CardContent className="py-10 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <div>
                  <h3 className="font-semibold">Couldn&apos;t load your subscriptions</h3>
                  <p className="text-muted-foreground text-sm">{state.loadError}</p>
                </div>
                <Button onClick={() => reloadSubscriptions()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : isNewUser ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No subscriptions tracked yet. Add one manually, or check above for recurring charges detected from your transaction history.
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.subscriptions.map((sub) => {
              const cat = getCategory(sub.category)
              return (
                <Card key={sub.id} className={cn(hoverLift, !sub.isActive && "opacity-60")}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat?.icon}</span>
                        <span>{sub.name}</span>
                      </div>
                      <Badge className={sub.paidForCurrentCycle ? "bg-green-600 hover:bg-green-600" : ""} variant={sub.paidForCurrentCycle ? undefined : "secondary"}>
                        {sub.paidForCurrentCycle ? "Paid" : "Unpaid"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Renews {sub.nextBillingDate} ({sub.billingCycle})
                        {sub.provider && ` - ${sub.provider}`}
                      </span>
                      <span className="font-medium text-foreground">
                        {currencySymbol}
                        {sub.amount.toLocaleString()}
                      </span>
                    </div>
                    {!sub.isActive && <p className="text-xs text-muted-foreground">Inactive.</p>}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={sub.paidForCurrentCycle ? "outline" : "default"} onClick={() => handleTogglePaid(sub)} disabled={togglingSubId === sub.id}>
                        {sub.paidForCurrentCycle ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Undo
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Mark paid
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(sub)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(sub)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
    </div>
  )
}
