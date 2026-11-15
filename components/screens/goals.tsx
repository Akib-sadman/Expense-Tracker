"use client"

import { useState } from "react"
import { Plus, Target, Trash2, Edit, PlusCircle, X, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useGoals, type Goal } from "@/contexts/goals-context"
import { useAuth } from "@/contexts/auth-context"
import { getCurrencySymbol } from "@/lib/currency"
import { hoverLift } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface FormState {
  name: string
  targetAmount: string
  targetDate: string
  hasSchedule: boolean
  scheduleAmount: string
  scheduleDay: string
}

const EMPTY_FORM: FormState = { name: "", targetAmount: "", targetDate: "", hasSchedule: false, scheduleAmount: "", scheduleDay: "1" }

function scheduleBadge(goal: Goal) {
  if (goal.isAchieved) return <Badge className="bg-green-600 hover:bg-green-600">Achieved</Badge>
  if (!goal.schedule) return null
  if (goal.schedule.isOverdue) return <Badge variant="destructive">Contribution overdue</Badge>
  if (goal.schedule.isDueSoon) return <Badge className="bg-orange-500 hover:bg-orange-500">Contribution due soon</Badge>
  if (goal.schedule.contributedThisCycle) return <Badge className="bg-green-600 hover:bg-green-600">Contributed this cycle</Badge>
  return <Badge variant="secondary">On schedule</Badge>
}

export default function Goals() {
  const { state, reloadGoals, createGoal, updateGoal, deleteGoal, addContribution, removeContribution } = useGoals()
  const { state: authState } = useAuth()
  const currencySymbol = getCurrencySymbol(authState.user?.preferences.currency)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [contributionDrafts, setContributionDrafts] = useState<Record<string, string>>({});
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null)

  const openCreate = (prefillName?: string) => {
    setEditingGoal(null)
    setForm(prefillName ? { ...EMPTY_FORM, name: prefillName } : EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const suggestedGoals = (authState.user?.onboarding?.answers?.financialGoals as string[] | undefined)?.filter(
    (name) => !state.goals.some((g) => g.name.toLowerCase() === name.toLowerCase())
  ) ?? []

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      targetDate: goal.targetDate ?? "",
      hasSchedule: goal.scheduleAmount != null,
      scheduleAmount: goal.scheduleAmount != null ? String(goal.scheduleAmount) : "",
      scheduleDay: goal.scheduleDay != null ? String(goal.scheduleDay) : "1",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    const targetAmount = Number.parseFloat(form.targetAmount)
    if (!form.name.trim()) return setFormError("Name is required.")
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return setFormError("Target amount must be greater than 0.")
    let scheduleAmount: number | undefined
    let scheduleDay: number | undefined
    if (form.hasSchedule) {
      scheduleAmount = Number.parseFloat(form.scheduleAmount)
      scheduleDay = Number.parseInt(form.scheduleDay, 10)
      if (!Number.isFinite(scheduleAmount) || scheduleAmount <= 0) return setFormError("Schedule amount must be greater than 0.")
      if (!Number.isInteger(scheduleDay) || scheduleDay < 1 || scheduleDay > 31) return setFormError("Schedule day must be between 1 and 31.")
    }

    setSaving(true)
    setFormError(null)
    const result = editingGoal
      ? await updateGoal(editingGoal.id, {
          name: form.name.trim(),
          targetAmount,
          targetDate: form.targetDate || null,
          scheduleAmount: form.hasSchedule ? scheduleAmount : null,
          scheduleDay: form.hasSchedule ? scheduleDay : null,
        })
      : await createGoal({
          name: form.name.trim(),
          targetAmount,
          ...(form.targetDate ? { targetDate: form.targetDate } : {}),
          ...(form.hasSchedule ? { scheduleAmount, scheduleDay } : {}),
        })
    setSaving(false)
    if (!result.success) return setFormError(result.error || "Could not save goal.")
    setDialogOpen(false)
  }

  const handleDelete = async (goal: Goal) => {
    setActionError(null)
    const result = await deleteGoal(goal.id)
    if (!result.success) setActionError(result.error || "Could not delete goal.")
  }

  const handleAddContribution = async (goal: Goal) => {
    if (contributingGoalId) return
    const raw = contributionDrafts[goal.id]
    const amount = Number.parseFloat(raw)
    if (!Number.isFinite(amount) || amount <= 0) return setActionError("Contribution amount must be greater than 0.")
    setActionError(null)
    setContributingGoalId(goal.id)
    try {
      const result = await addContribution(goal.id, { amount })
      if (!result.success) return setActionError(result.error || "Could not add contribution.")
      setContributionDrafts((d) => ({ ...d, [goal.id]: "" }))
    } finally {
      setContributingGoalId(null)
    }
  }

  const isNewUser = state.goals.length === 0 && !state.isLoading && !state.loadError

  return (
    <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="hidden sm:block text-muted-foreground">Track progress toward a target, with an optional planned contribution schedule.</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openCreate()} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingGoal ? "Edit Goal" : "Add Goal"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {formError && (
                    <Alert className="border-red-500/30 bg-red-500/10">
                      <AlertDescription className="text-red-700 dark:text-red-300">{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="goal-name">Name</Label>
                    <Input id="goal-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency fund" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-target">Target amount</Label>
                    <Input
                      id="goal-target"
                      type="number"
                      min={0}
                      value={form.targetAmount}
                      onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-date">Target date (optional)</Label>
                    <Input id="goal-date" type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="goal-has-schedule"
                      type="checkbox"
                      checked={form.hasSchedule}
                      onChange={(e) => setForm((f) => ({ ...f, hasSchedule: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="goal-has-schedule">Plan a recurring monthly contribution</Label>
                  </div>

                  {form.hasSchedule && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="goal-schedule-amount">Amount per month</Label>
                        <Input
                          id="goal-schedule-amount"
                          type="number"
                          min={0}
                          value={form.scheduleAmount}
                          onChange={(e) => setForm((f) => ({ ...f, scheduleAmount: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="goal-schedule-day">Day of month</Label>
                        <Input
                          id="goal-schedule-day"
                          type="number"
                          min={1}
                          max={31}
                          value={form.scheduleDay}
                          onChange={(e) => setForm((f) => ({ ...f, scheduleDay: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving..." : editingGoal ? "Save changes" : "Add goal"}
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
              <Loader2 className="w-4 h-4 animate-spin" /> Loading goals...
            </div>
          ) : state.loadError ? (
            <Card>
              <CardContent className="py-10 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <div>
                  <h3 className="font-semibold">Couldn&apos;t load your goals</h3>
                  <p className="text-muted-foreground text-sm">{state.loadError}</p>
                </div>
                <Button onClick={() => reloadGoals()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : isNewUser ? (
            <Card>
              <CardContent className="py-10 text-center space-y-4">
                <p className="text-muted-foreground">
                  No savings goals yet. Set a target - like an emergency fund or a trip - and optionally plan a monthly contribution.
                </p>
                {suggestedGoals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">From what you told us during setup:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {suggestedGoals.map((name) => (
                        <Button key={name} type="button" size="sm" variant="outline" onClick={() => openCreate(name)}>
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          {name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.goals.map((goal) => (
              <Card key={goal.id} className={cn(hoverLift, !goal.isActive && "opacity-60")}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      <span>{goal.name}</span>
                    </div>
                    {scheduleBadge(goal)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {currencySymbol}
                      {goal.savedAmount.toLocaleString()} of {currencySymbol}
                      {goal.targetAmount.toLocaleString()}
                    </span>
                    <span className="font-medium">{goal.percentComplete}%</span>
                  </div>
                  <div className="w-full bg-muted h-2">
                    <div
                      className={`h-2 ${goal.isAchieved ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(goal.percentComplete, 100)}%` }}
                    />
                  </div>
                  {goal.targetDate && <p className="text-xs text-muted-foreground">Target date: {goal.targetDate}</p>}
                  {goal.schedule && !goal.isAchieved && (
                    <p className="text-xs text-muted-foreground">
                      Plan: {currencySymbol}
                      {goal.schedule.amount.toLocaleString()}/month on day {goal.schedule.day} - next {goal.schedule.nextContributionDate} - about{" "}
                      {goal.schedule.contributionsRemaining} more contribution{goal.schedule.contributionsRemaining === 1 ? "" : "s"} to reach the target
                    </p>
                  )}
                  {!goal.isActive && <p className="text-xs text-muted-foreground">Inactive - schedule alerts paused.</p>}

                  {!goal.isAchieved && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Add contribution"
                        value={contributionDrafts[goal.id] ?? ""}
                        onChange={(e) => setContributionDrafts((d) => ({ ...d, [goal.id]: e.target.value }))}
                        className="h-9"
                      />
                      <Button size="sm" onClick={() => handleAddContribution(goal)} disabled={contributingGoalId === goal.id}>
                        <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                        Add
                      </Button>
                    </div>
                  )}

                  {goal.contributions.length > 0 && (
                    <div className="space-y-1 pt-1 border-t">
                      {goal.contributions.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {currencySymbol}
                            {c.amount.toLocaleString()} - {new Date(c.contributedAt).toLocaleDateString()}
                          </span>
                          <button onClick={() => removeContribution(goal.id, c.id)} aria-label="Remove contribution" className="hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(goal)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(goal)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
    </div>
  )
}
