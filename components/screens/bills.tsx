"use client"

import { useState } from "react"
import { Plus, Calendar as CalendarIcon, Trash2, Edit, CheckCircle, AlertTriangle, RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useBills, type Bill, type BillRecurrence } from "@/contexts/bills-context"
import { useAuth } from "@/contexts/auth-context"
import { CATEGORIES, getCategory } from "@/lib/categories"
import { getCurrencySymbol } from "@/lib/currency"
import { hoverLift } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface FormState {
  name: string
  category: string
  amount: string
  recurrence: BillRecurrence
  dueDay: string
  dueDate: string
}

const EMPTY_FORM: FormState = { name: "", category: "bills", amount: "", recurrence: "monthly", dueDay: "1", dueDate: "" }

function statusBadge(bill: Bill) {
  if (bill.paid) return <Badge className="bg-green-600 hover:bg-green-600">Paid</Badge>
  if (bill.isOverdue) return <Badge variant="destructive">Overdue</Badge>
  if (bill.isDueSoon) return <Badge className="bg-orange-500 hover:bg-orange-500">Due soon</Badge>
  return <Badge variant="secondary">Upcoming</Badge>
}

export default function Bills() {
  const { state, reloadBills, createBill, updateBill, deleteBill, payBill, undoBillPayment } = useBills()
  const { state: authState } = useAuth()
  const currencySymbol = getCurrencySymbol(authState.user?.preferences.currency)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [togglingBillId, setTogglingBillId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingBill(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (bill: Bill) => {
    setEditingBill(bill)
    setForm({
      name: bill.name,
      category: bill.category,
      amount: String(bill.amount),
      recurrence: bill.recurrence,
      dueDay: String(bill.dueDay ?? 1),
      dueDate: bill.dueDate ?? "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    const amount = Number.parseFloat(form.amount)
    if (!form.name.trim()) return setFormError("Name is required.")
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Amount must be greater than 0.")
    if (form.recurrence === "monthly" && (!Number.isInteger(Number(form.dueDay)) || Number(form.dueDay) < 1 || Number(form.dueDay) > 31)) {
      return setFormError("Due day must be between 1 and 31.")
    }
    if (form.recurrence === "one_time" && !form.dueDate) {
      return setFormError("Due date is required for a one-time bill.")
    }

    setSaving(true)
    setFormError(null)
    const result = editingBill
      ? await updateBill(editingBill.id, {
          name: form.name.trim(),
          category: form.category,
          amount,
          ...(editingBill.recurrence === "monthly" ? { dueDay: Number(form.dueDay) } : { dueDate: form.dueDate }),
        })
      : await createBill({
          name: form.name.trim(),
          category: form.category,
          amount,
          recurrence: form.recurrence,
          ...(form.recurrence === "monthly" ? { dueDay: Number(form.dueDay) } : { dueDate: form.dueDate }),
        })
    setSaving(false)
    if (!result.success) return setFormError(result.error || "Could not save bill.")
    setDialogOpen(false)
  }

  const handleDelete = async (bill: Bill) => {
    setActionError(null)
    const result = await deleteBill(bill.id)
    if (!result.success) setActionError(result.error || "Could not delete bill.")
  }

  const handleTogglePaid = async (bill: Bill) => {
    if (togglingBillId) return
    setActionError(null)
    setTogglingBillId(bill.id)
    try {
      const result = bill.paid ? await undoBillPayment(bill.id) : await payBill(bill.id)
      if (!result.success) setActionError(result.error || "Could not update payment status.")
    } finally {
      setTogglingBillId(null)
    }
  }

  const isNewUser = state.bills.length === 0 && !state.isLoading && !state.loadError

  return (
    <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="hidden sm:block text-muted-foreground">One-time and recurring bills, with due-date and payment tracking.</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingBill ? "Edit Bill" : "Add Bill"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {formError && (
                    <Alert className="border-red-500/30 bg-red-500/10">
                      <AlertDescription className="text-red-700 dark:text-red-300">{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="bill-name">Name</Label>
                    <Input id="bill-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bill-category">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger id="bill-category">
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
                    <Label htmlFor="bill-amount">Amount</Label>
                    <Input
                      id="bill-amount"
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>

                  {}
                  {!editingBill && (
                    <div className="space-y-2">
                      <Label>Recurrence</Label>
                      <RadioGroup value={form.recurrence} onValueChange={(v) => setForm((f) => ({ ...f, recurrence: v as BillRecurrence }))} className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="monthly" id="recurrence-monthly" />
                          <Label htmlFor="recurrence-monthly">Monthly</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="one_time" id="recurrence-one_time" />
                          <Label htmlFor="recurrence-one_time">One-time</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {(editingBill ? editingBill.recurrence : form.recurrence) === "monthly" ? (
                    <div className="space-y-2">
                      <Label htmlFor="bill-due-day">Due day of month</Label>
                      <Input
                        id="bill-due-day"
                        type="number"
                        min={1}
                        max={31}
                        value={form.dueDay}
                        onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="bill-due-date">Due date</Label>
                      <Input
                        id="bill-due-date"
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving..." : editingBill ? "Save changes" : "Add bill"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {actionError && (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 dark:text-red-300">{actionError}</AlertDescription>
            </Alert>
          )}

          {}
          {state.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading bills...
            </div>
          ) : state.loadError ? (
            <Card>
              <CardContent className="py-10 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <div>
                  <h3 className="font-semibold">Couldn&apos;t load your bills</h3>
                  <p className="text-muted-foreground text-sm">{state.loadError}</p>
                </div>
                <Button onClick={() => reloadBills()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : isNewUser ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No bills yet. Add a recurring bill (like rent or internet) or a one-time bill (like a car repair) to start tracking due dates and payments.
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.bills.map((bill) => {
              const cat = getCategory(bill.category)
              return (
                <Card key={bill.id} className={cn(hoverLift, !bill.isActive && "opacity-60")}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat?.icon}</span>
                        <span>{bill.name}</span>
                      </div>
                      {statusBadge(bill)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {bill.recurrence === "monthly" ? `Due ${bill.dueDate} (monthly, day ${bill.dueDay})` : `Due ${bill.dueDate} (one-time)`}
                      </span>
                      <span className="font-medium text-foreground">
                        {currencySymbol}
                        {bill.amount.toLocaleString()}
                      </span>
                    </div>
                    {!bill.isActive && <p className="text-xs text-muted-foreground">Inactive - not counted toward upcoming bills.</p>}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={bill.paid ? "outline" : "default"} onClick={() => handleTogglePaid(bill)} disabled={togglingBillId === bill.id}>
                        {bill.paid ? (
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
                      <Button size="sm" variant="outline" onClick={() => openEdit(bill)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(bill)}>
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
