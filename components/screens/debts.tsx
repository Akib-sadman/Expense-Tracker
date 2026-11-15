"use client"

import { useState, useRef } from "react"
import { Plus, Trash2, Edit, X, Calendar as CalendarIcon, ListOrdered, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDebts, type Debt, type DebtType, type AmortizationPeriod } from "@/contexts/debts-context"
import { useAuth } from "@/contexts/auth-context"
import { getCurrencySymbol } from "@/lib/currency"
import { hoverLift } from "@/lib/motion"
import { cn } from "@/lib/utils"

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  auto_loan: "Auto Loan",
  student_loan: "Student Loan",
  mortgage: "Mortgage",
  other: "Other",
}

interface FormState {
  name: string
  debtType: DebtType
  principal: string
  interestRatePct: string
  termMonths: string
  startDate: string
}

const EMPTY_FORM: FormState = { name: "", debtType: "personal_loan", principal: "", interestRatePct: "", termMonths: "", startDate: "" }

export default function Debts() {
  const { state, reloadDebts, createDebt, updateDebt, deleteDebt, addPayment, removePayment, fetchSchedule } = useDebts()
  const { state: authState } = useAuth()
  const currencySymbol = getCurrencySymbol(authState.user?.preferences.currency)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, string>>({})
  const [paymentSubmitting, setPaymentSubmitting] = useState<Record<string, boolean>>({})
  const paymentIdempotencyKeys = useRef<Record<string, string>>({})

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<AmortizationPeriod[] | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingDebt(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setForm({
      name: debt.name,
      debtType: debt.debtType,
      principal: String(debt.principal),
      interestRatePct: String(debt.interestRatePct),
      termMonths: String(debt.termMonths),
      startDate: debt.startDate,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    const principal = Number.parseFloat(form.principal)
    const interestRatePct = Number.parseFloat(form.interestRatePct)
    const termMonths = Number.parseInt(form.termMonths, 10)
    if (!form.name.trim()) return setFormError("Name is required.")
    if (!Number.isFinite(principal) || principal <= 0) return setFormError("Principal must be greater than 0.")
    if (!Number.isFinite(interestRatePct) || interestRatePct < 0) return setFormError("Interest rate must be 0 or greater.")
    if (!Number.isInteger(termMonths) || termMonths <= 0) return setFormError("Term (months) must be a positive whole number.")
    if (!form.startDate) return setFormError("Start date is required.")

    setSaving(true)
    setFormError(null)
    const result = editingDebt
      ? await updateDebt(editingDebt.id, { name: form.name.trim(), debtType: form.debtType, principal, interestRatePct, termMonths, startDate: form.startDate })
      : await createDebt({ name: form.name.trim(), debtType: form.debtType, principal, interestRatePct, termMonths, startDate: form.startDate })
    setSaving(false)
    if (!result.success) return setFormError(result.error || "Could not save debt.")
    setDialogOpen(false)
  }

  const handleDelete = async (debt: Debt) => {
    setActionError(null)
    const result = await deleteDebt(debt.id)
    if (!result.success) setActionError(result.error || "Could not delete debt.")
  }

  const handleAddPayment = async (debt: Debt) => {
    if (paymentSubmitting[debt.id]) return
    const raw = paymentDrafts[debt.id]
    const amount = Number.parseFloat(raw)
    if (!Number.isFinite(amount) || amount <= 0) return setActionError("Payment amount must be greater than 0.")
    setActionError(null)
    setPaymentSubmitting((s) => ({ ...s, [debt.id]: true }))
    if (!paymentIdempotencyKeys.current[debt.id]) {
      paymentIdempotencyKeys.current[debt.id] = crypto.randomUUID()
    }
    try {
      const result = await addPayment(debt.id, { amount, idempotencyKey: paymentIdempotencyKeys.current[debt.id] })
      if (!result.success) return setActionError(result.error || "Could not add payment.")
      setPaymentDrafts((d) => ({ ...d, [debt.id]: "" }))
      delete paymentIdempotencyKeys.current[debt.id] 
    } finally {
      setPaymentSubmitting((s) => ({ ...s, [debt.id]: false }))
    }
  }

  const openSchedule = async (debt: Debt) => {
    setScheduleFor(debt.name)
    setSchedule(null)
    setScheduleError(null)
    setScheduleOpen(true)
    const result = await fetchSchedule(debt.id)
    if (!result.success) return setScheduleError(result.error || "Could not load schedule.")
    setSchedule(result.data || [])
  }

  const isNewUser = state.debts.length === 0 && !state.isLoading && !state.loadError

  return (
    <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="hidden sm:block text-muted-foreground">Track principal, interest, payments, and payoff projections.</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Debt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDebt ? "Edit Debt" : "Add Debt"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {formError && (
                    <Alert className="border-red-500/30 bg-red-500/10">
                      <AlertDescription className="text-red-700 dark:text-red-300">{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="debt-name">Name</Label>
                    <Input id="debt-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Car loan" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debt-type">Type</Label>
                    <Select value={form.debtType} onValueChange={(v) => setForm((f) => ({ ...f, debtType: v as DebtType }))}>
                      <SelectTrigger id="debt-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {DEBT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="debt-principal">Principal</Label>
                      <Input id="debt-principal" type="number" min={0} value={form.principal} onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debt-rate">Interest rate (% APR)</Label>
                      <Input id="debt-rate" type="number" min={0} step="0.01" value={form.interestRatePct} onChange={(e) => setForm((f) => ({ ...f, interestRatePct: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="debt-term">Term (months)</Label>
                      <Input id="debt-term" type="number" min={1} value={form.termMonths} onChange={(e) => setForm((f) => ({ ...f, termMonths: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debt-start">Start date</Label>
                      <Input id="debt-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving..." : editingDebt ? "Save changes" : "Add debt"}
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

          {}
          {state.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading debts...
            </div>
          ) : state.loadError ? (
            <Card>
              <CardContent className="py-10 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <div>
                  <h3 className="font-semibold">Couldn&apos;t load your debts</h3>
                  <p className="text-muted-foreground text-sm">{state.loadError}</p>
                </div>
                <Button onClick={() => reloadDebts()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : isNewUser ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No debts tracked yet. Add a loan or credit card balance to track payoff progress.
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.debts.map((debt) => {
              const paidPct = debt.principal > 0 ? Math.min(100, Math.round((debt.totalPrincipalPaid / debt.principal) * 100)) : 0
              return (
                <Card key={debt.id} className={cn(hoverLift, !debt.isActive && "opacity-60")}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{debt.name}</span>
                      {debt.isPaidOff ? (
                        <Badge className="bg-green-600 hover:bg-green-600">Paid off</Badge>
                      ) : (
                        <Badge variant="secondary">{DEBT_TYPE_LABELS[debt.debtType]}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {currencySymbol}
                        {debt.totalPrincipalPaid.toLocaleString()} paid of {currencySymbol}
                        {debt.principal.toLocaleString()}
                      </span>
                      <span className="font-medium">{paidPct}%</span>
                    </div>
                    <div className="w-full bg-muted h-2">
                      <div className={`h-2 ${debt.isPaidOff ? "bg-green-500" : "bg-primary"}`} style={{ width: `${paidPct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        {debt.interestRatePct}% APR - {debt.termMonths}mo term - since {debt.startDate}
                      </p>
                      <p>
                        Remaining principal: {currencySymbol}
                        {debt.remainingPrincipal.toLocaleString()} - Monthly payment: {currencySymbol}
                        {debt.monthlyPayment.toLocaleString()}
                      </p>
                      {!debt.isPaidOff && debt.payoff && (
                        <p>
                          {debt.payoff.payoffPossible
                            ? `Payoff in ~${debt.payoff.monthsRemaining} more month${debt.payoff.monthsRemaining === 1 ? "" : "s"} (around ${debt.payoff.projectedPayoffDate}) at the current monthly payment.`
                            : "At the current monthly payment, this loan will never pay off - the payment doesn't cover accruing interest."}
                        </p>
                      )}
                    </div>

                    {!debt.isPaidOff && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Add payment"
                          value={paymentDrafts[debt.id] ?? ""}
                          onChange={(e) => {
                            setPaymentDrafts((d) => ({ ...d, [debt.id]: e.target.value }))
                            delete paymentIdempotencyKeys.current[debt.id]
                          }}
                          className="h-9"
                        />
                        <Button size="sm" onClick={() => handleAddPayment(debt)} disabled={paymentSubmitting[debt.id]}>
                          {paymentSubmitting[debt.id] ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    )}

                    {debt.payments.length > 0 && (
                      <div className="space-y-1 pt-1 border-t">
                        {debt.payments.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {currencySymbol}
                              {p.amount.toLocaleString()} - {new Date(p.paidAt).toLocaleDateString()}
                            </span>
                            <button onClick={() => removePayment(debt.id, p.id)} aria-label="Remove payment" className="hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openSchedule(debt)}>
                        <ListOrdered className="w-3.5 h-3.5 mr-1.5" />
                        Schedule
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(debt)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(debt)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Amortization schedule{scheduleFor ? ` - ${scheduleFor}` : ""}
            </DialogTitle>
          </DialogHeader>
          {scheduleError && (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertDescription className="text-red-700 dark:text-red-300">{scheduleError}</AlertDescription>
            </Alert>
          )}
          {!scheduleError && !schedule && <p className="text-sm text-muted-foreground">Loading...</p>}
          {schedule && (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.dueDate}</TableCell>
                      <TableCell className="text-right">
                        {currencySymbol}
                        {row.payment.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {currencySymbol}
                        {row.principal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {currencySymbol}
                        {row.interest.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {currencySymbol}
                        {row.remainingBalance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
