"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Target, Plus, Save, AlertTriangle, CheckCircle, RefreshCw, Pencil, Wallet } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ChartEmpty } from "@/components/ui/chart-empty"
import { useChartAnimation } from "@/hooks/use-chart-animation"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts"
import { useExpense, type BudgetStatus } from "@/contexts/expense-context"
import { useAuth } from "@/contexts/auth-context"
import { CATEGORIES, getCategory } from "@/lib/categories"
import { getCurrencySymbol, formatMoney } from "@/lib/currency"
import { GradientStatCard } from "@/components/ui/gradient-stat-card"
import { hoverLift } from "@/lib/motion"

const chartConfig = {}

export default function BudgetPlanning() {
  const chartAnimation = useChartAnimation()
  const { fetchBudgetStatus, setBudgets, updateBudgetSetting, setMonthlyBudget, state: expenseState } = useExpense()
  const { state: authState } = useAuth()
  const currencySymbol = getCurrencySymbol(authState.user?.preferences.currency)

  const [statuses, setStatuses] = useState<BudgetStatus[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({})
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({})
  const [rolloverDrafts, setRolloverDrafts] = useState<Record<string, boolean>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const [saving, setSaving] = useState(false)

  // Overall monthly budget (separate from the per-category limits below).
  const [editingMain, setEditingMain] = useState(false)
  const [mainDraft, setMainDraft] = useState("")
  const [savingMain, setSavingMain] = useState(false)

  // "Add budget" dialog: pick a category and give it a monthly limit.
  const [addOpen, setAddOpen] = useState(false)
  const [addCategory, setAddCategory] = useState("")
  const [addAmount, setAddAmount] = useState("")
  const [addingBudget, setAddingBudget] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  const load = async () => {
    setIsLoading(true)
    setLoadError(null)
    const result = await fetchBudgetStatus()
    setIsLoading(false)
    if (!result.success || !result.data) {
      setLoadError(result.error || "Could not load budget status.")
      return
    }
    setStatuses(result.data)
    setLimitDrafts(Object.fromEntries(result.data.map((s) => [s.category, String(s.limit)])))
    setThresholdDrafts(Object.fromEntries(result.data.map((s) => [s.category, String(s.alertThresholdPct)])))
    setRolloverDrafts(Object.fromEntries(result.data.map((s) => [s.category, s.rolloverEnabled])))
    setHasUnsavedChanges(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleLimitChange = (category: string, value: string) => {
    setLimitDrafts((prev) => ({ ...prev, [category]: value }))
    setHasUnsavedChanges(true)
  }

  const handleThresholdChange = (category: string, value: string) => {
    setThresholdDrafts((prev) => ({ ...prev, [category]: value }))
    setHasUnsavedChanges(true)
  }

  const handleRolloverChange = (category: string, value: boolean) => {
    setRolloverDrafts((prev) => ({ ...prev, [category]: value }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    if (!statuses) return
    setSaving(true)
    setSaveMessage(null)

    const limits = Object.fromEntries(
      Object.entries(limitDrafts).map(([key, value]) => [key, Math.max(0, Number.parseFloat(value) || 0)])
    )
    const limitsResult = await setBudgets(limits)

    const changedSettings = statuses.filter((s) => {
      const draftThreshold = Number.parseInt(thresholdDrafts[s.category], 10)
      const draftRollover = rolloverDrafts[s.category]
      return draftThreshold !== s.alertThresholdPct || draftRollover !== s.rolloverEnabled
    })
    const settingsResults = await Promise.all(
      changedSettings.map((s) =>
        updateBudgetSetting(s.category, {
          alertThresholdPct: Number.parseInt(thresholdDrafts[s.category], 10),
          rolloverEnabled: rolloverDrafts[s.category],
        })
      )
    )

    setSaving(false)
    const failures = [limitsResult, ...settingsResults].filter((r) => !r.success)
    if (failures.length > 0) {
      setSaveMessage({ kind: "error", text: failures[0].error || "Could not save all changes." })
      return
    }
    setSaveMessage({ kind: "success", text: "Budgets saved." })
    await load()
  }

  const saveMain = async (amount: number | null) => {
    setSavingMain(true)
    const result = await setMonthlyBudget(amount)
    setSavingMain(false)
    if (!result.success) {
      setSaveMessage({ kind: "error", text: result.error || "Could not save the monthly budget." })
      return
    }
    setEditingMain(false)
    setSaveMessage({ kind: "success", text: amount == null ? "Monthly budget cleared." : "Monthly budget saved." })
  }

  // Category budgets are shares of the monthly budget: this is how much is left to hand out.
  const mainBudget = expenseState.monthlyBudget
  const allocatedTotal = statuses?.reduce((sum, st) => sum + st.limit, 0) ?? 0
  const limitOf = (category: string) => statuses?.find((st) => st.category === category)?.limit ?? 0
  const availableFor = (category: string) => (mainBudget == null ? null : Math.max(0, mainBudget - allocatedTotal + limitOf(category)))

  const openAddBudget = () => {
    if (mainBudget == null) {
      // The categories are carved out of the monthly budget, so that comes first.
      setMainDraft("")
      setEditingMain(true)
      setSaveMessage({ kind: "success", text: "Set your monthly budget first - then share it out across categories." })
      return
    }
    const firstUnset = statuses?.find((st) => st.limit === 0)?.category ?? CATEGORIES[0].value
    setAddCategory(firstUnset)
    setAddAmount("")
    setAddError(null)
    setAddOpen(true)
  }

  const handleAddBudget = async () => {
    const amount = Number.parseFloat(addAmount)
    if (!addCategory) return setAddError("Choose a category.")
    if (!Number.isFinite(amount) || amount <= 0) return setAddError("Enter a monthly limit greater than 0.")
    const available = availableFor(addCategory)
    if (available != null && amount > available) {
      return setAddError(`Only ${formatMoney(available, currencySymbol)} of your monthly budget is left for this category.`)
    }
    setAddingBudget(true)
    const result = await setBudgets({ [addCategory]: amount } as any)
    if (!result.success) {
      setAddingBudget(false)
      return setAddError(result.error || "Could not save the budget.")
    }
    // Refresh the numbers but keep any other unsaved edits on the cards below.
    const fresh = await fetchBudgetStatus()
    setAddingBudget(false)
    if (fresh.success && fresh.data) setStatuses(fresh.data)
    setLimitDrafts((prev) => ({ ...prev, [addCategory]: String(amount) }))
    setAddOpen(false)
    setSaveMessage({ kind: "success", text: `${getCategory(addCategory)?.label ?? addCategory} budget set to ${formatMoney(amount, currencySymbol)}.` })
    setTimeout(() => document.getElementById(`budget-card-${addCategory}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
  }

  const totalLimit = statuses?.reduce((sum, s) => sum + s.limit, 0) ?? 0
  const totalSpent = statuses?.reduce((sum, s) => sum + s.spent, 0) ?? 0
  const overBudgetCategories = statuses?.filter((s) => s.isOverBudget) ?? []
  const nearThresholdCategories = statuses?.filter((s) => s.isNearThreshold) ?? []
  const alertCount = overBudgetCategories.length + nearThresholdCategories.length

  const comparisonData = (statuses ?? []).map((s) => ({
    category: getCategory(s.category)?.label.split(" ")[0] ?? s.category,
    spent: s.spent,
    limit: s.effectiveLimit,
  }))

  if (isLoading && !statuses) {
    return <p className="text-muted-foreground">Loading budgets...</p>
  }

  return (
    <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="hidden sm:block text-muted-foreground">Real spending this month against limits you set, with optional rollover and alert thresholds.</p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="outline" onClick={load} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button onClick={openAddBudget} disabled={!statuses} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add budget
              </Button>
              {hasUnsavedChanges && (
                <Button variant="outline" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              )}
            </div>
          </div>

          {loadError && (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-700 dark:text-red-300">Could not load budgets</AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-300">{loadError}</AlertDescription>
            </Alert>
          )}

          {saveMessage && (
            <Alert className={saveMessage.kind === "success" ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}>
              {saveMessage.kind === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={saveMessage.kind === "success" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                {saveMessage.text}
              </AlertDescription>
            </Alert>
          )}

          {statuses && (() => {
            const main = expenseState.monthlyBudget
            const spentAll = statuses.reduce((sum, st) => sum + st.spent, 0)
            const pct = main && main > 0 ? Math.round((spentAll / main) * 100) : 0
            const allocated = statuses.reduce((sum, st) => sum + st.limit, 0)
            return (
              <Card className="border-primary/30 dark:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        Monthly budget
                      </CardTitle>
                      <CardDescription>Your total for the month. Category budgets below are shares of it.</CardDescription>
                    </div>
                    {!editingMain && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMainDraft(main != null ? String(main) : "")
                          setEditingMain(true)
                        }}
                      >
                        {main != null ? <Pencil className="w-3.5 h-3.5 mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                        {main != null ? "Edit" : "Set monthly budget"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editingMain ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const amount = Number.parseFloat(mainDraft)
                        if (!Number.isFinite(amount) || amount <= 0) return
                        saveMain(amount)
                      }}
                    >
                      <div className="relative flex-1 min-w-[160px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{currencySymbol}</span>
                        <Input
                          autoFocus
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={mainDraft}
                          onChange={(e) => setMainDraft(e.target.value)}
                          placeholder="e.g. 80000"
                          className="pl-8"
                          aria-label="Monthly budget"
                        />
                      </div>
                      <Button type="submit" disabled={savingMain || !(Number.parseFloat(mainDraft) > 0)}>
                        {savingMain ? "Saving..." : "Save"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingMain(false)}>
                        Cancel
                      </Button>
                      {main != null && (
                        <Button type="button" variant="ghost" className="text-destructive" onClick={() => saveMain(null)} disabled={savingMain}>
                          Remove
                        </Button>
                      )}
                    </form>
                  ) : main != null ? (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-2xl font-bold tabular-nums">
                          {formatMoney(spentAll, currencySymbol)}
                          <span className="text-base font-normal text-muted-foreground"> of {formatMoney(main, currencySymbol)}</span>
                        </p>
                        <p className={cn("text-sm font-medium", spentAll > main ? "text-danger" : "text-success")}>
                          {spentAll > main
                            ? `${formatMoney(spentAll - main, currencySymbol)} over`
                            : `${formatMoney(main - spentAll, currencySymbol)} left`}
                        </p>
                      </div>
                      <Progress value={Math.min(pct, 100)} className={cn("h-2", spentAll > main && "[&>div]:bg-red-500")} aria-label="Monthly budget used" />
                      <p className="text-xs text-muted-foreground">{pct}% spent</p>
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <span>
                            Shared out to categories: <span className="font-medium tabular-nums">{formatMoney(allocated, currencySymbol)}</span>
                          </span>
                          <span className={cn("font-medium tabular-nums", allocated > main ? "text-danger" : "text-muted-foreground")}>
                            {allocated > main
                              ? `${formatMoney(allocated - main, currencySymbol)} over the total`
                              : `${formatMoney(main - allocated, currencySymbol)} unallocated`}
                          </span>
                        </div>
                        <Progress value={main > 0 ? Math.min((allocated / main) * 100, 100) : 0} className="h-1.5 [&>div]:bg-primary" aria-label="Monthly budget allocated to categories" />
                        <p className="text-xs text-muted-foreground">
                          Unallocated money still counts toward the monthly total - use &quot;Add budget&quot; to give a category its own share.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not set yet. Set one total for the month, then share it out across categories. You&apos;ve spent{" "}
                      {formatMoney(spentAll, currencySymbol)} so far this month.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {statuses && (
            <>
              {}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GradientStatCard
                  label="Category Budgets"
                  tone="teal"
                  icon={Target}
                  reveal
                  countUp={{ value: totalLimit, format: (n) => currencySymbol + Math.round(n).toLocaleString() }}
                  subtitle="Sum of your category limits, before rollover"
                />

                <GradientStatCard
                  label="Spent This Month"
                  tone="blue"
                  icon={TrendingUp}
                  reveal
                  countUp={{ value: totalSpent, format: (n) => currencySymbol + Math.round(n).toLocaleString() }}
                  subtitle="Real spend, summed across all categories"
                />

                <Card className={hoverLift}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
                    {alertCount > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {alertCount > 0 ? (
                        <span className="text-orange-600">
                          {alertCount} Alert{alertCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-green-600">On Track</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {overBudgetCategories.length > 0
                        ? `${overBudgetCategories.length} over budget`
                        : nearThresholdCategories.length > 0
                          ? `${nearThresholdCategories.length} nearing threshold`
                          : "All categories within budget"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {alertCount > 0 && (
                <Alert className="border-orange-500/30 bg-orange-500/10">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-orange-700 dark:text-orange-300">Budget Alerts</AlertTitle>
                  <AlertDescription className="text-orange-700 dark:text-orange-300">
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[...overBudgetCategories, ...nearThresholdCategories].map((s) => {
                        const cat = getCategory(s.category)
                        return (
                          <Badge key={s.category} variant="outline" className="border-orange-500/30 text-orange-700 dark:text-orange-300">
                            {cat?.icon} {cat?.label ?? s.category} - {s.pct}%
                          </Badge>
                        )
                      })}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Card className={cn(hoverLift)}>
                <CardHeader>
                  <CardTitle>Spending vs Effective Limit</CardTitle>
                  <CardDescription>This month&apos;s real spend against each category&apos;s limit (rollover included)</CardDescription>
                </CardHeader>
                <CardContent>
                  {comparisonData.some((d) => d.spent > 0 || d.limit > 0) ? (
<ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                        <XAxis dataKey="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} className="text-gray-600" />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} className="text-gray-600" />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-popover text-popover-foreground p-3 border shadow-lg">
                                  <p className="font-medium">{label}</p>
                                  {payload.map((entry, index) => (
                                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                                      {entry.name}: {currencySymbol}{Number(entry.value ?? 0).toLocaleString()}
                                    </p>
                                  ))}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend />
                        <Bar dataKey="spent" fill="hsl(var(--primary))" radius={0} name="Spent" isAnimationActive={chartAnimation} />
                        <Bar dataKey="limit" fill="hsl(var(--muted-foreground) / 0.45)" radius={0} name="Effective Limit" isAnimationActive={chartAnimation} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <ChartEmpty title="No budget or spending to compare yet">Set a limit for a category and log some spending to see how you track.</ChartEmpty>
                )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...statuses].sort((x, y) => Number(y.limit > 0) - Number(x.limit > 0)).map((status) => {
                  const cat = getCategory(status.category)
                  const utilizationPercentage = Math.min(status.pct, 999)

                  return (
                    <Card key={status.category} id={`budget-card-${status.category}`} className={cn(hoverLift)}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{cat?.icon}</span>
                            <span>{cat?.label ?? status.category}</span>
                          </div>
                          <Badge variant={status.isOverBudget ? "destructive" : status.isNearThreshold ? "outline" : "secondary"}>
                            {status.limit > 0 ? `${utilizationPercentage}%` : "No limit set"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Spent: {currencySymbol}{status.spent.toLocaleString()} · Effective limit: {currencySymbol}
                          {status.effectiveLimit.toLocaleString()}
                          {status.rolledOver > 0 && ` (incl. ${currencySymbol}${status.rolledOver.toLocaleString()} rolled over)`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`budget-${status.category}`} className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Monthly Limit
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                              {currencySymbol}
                            </span>
                            <Input
                              id={`budget-${status.category}`}
                              type="number"
                              min={0}
                              value={limitDrafts[status.category] ?? "0"}
                              onChange={(e) => handleLimitChange(status.category, e.target.value)}
                              className="pl-8"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`threshold-${status.category}`}>Alert at (%)</Label>
                            <Input
                              id={`threshold-${status.category}`}
                              type="number"
                              min={1}
                              max={100}
                              value={thresholdDrafts[status.category] ?? "80"}
                              onChange={(e) => handleThresholdChange(status.category, e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`rollover-${status.category}`}>Rollover unspent</Label>
                            <div className="flex items-center h-10">
                              <Switch
                                id={`rollover-${status.category}`}
                                checked={rolloverDrafts[status.category] ?? false}
                                onCheckedChange={(v) => handleRolloverChange(status.category, v)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>This month&apos;s usage</span>
                            <span className={status.isOverBudget ? "text-red-600 font-medium" : "text-gray-600"}>
                              {status.limit > 0 ? `${utilizationPercentage}%` : "—"}
                            </span>
                          </div>
                          <div className="w-full bg-muted h-2">
                            <div
                              className={cn(
                                "h-2",
                                status.isOverBudget
                                  ? "bg-danger"
                                  : status.isNearThreshold
                                    ? "bg-warning"
                                    : "bg-success",
                              )}
                              style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a category budget</DialogTitle>
            <DialogDescription>Give a category its own share of your monthly budget. You&apos;ll get an alert as you get close to it.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleAddBudget()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="add-budget-category">Category</Label>
              <Select value={addCategory} onValueChange={setAddCategory}>
                <SelectTrigger id="add-budget-category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => {
                    const current = statuses?.find((st) => st.category === c.value)?.limit ?? 0
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                        {current > 0 ? ` (now ${formatMoney(current, currencySymbol)})` : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-budget-amount">Monthly limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{currencySymbol}</span>
                <Input
                  id="add-budget-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="e.g. 8000"
                  className="pl-8"
                />
              </div>
            </div>
            {availableFor(addCategory) != null && (
              <p className="text-xs text-muted-foreground">
                Available from your monthly budget:{" "}
                <span className="font-medium text-foreground">{formatMoney(availableFor(addCategory) ?? 0, currencySymbol)}</span>
                {limitOf(addCategory) > 0 && ` (includes this category's current ${formatMoney(limitOf(addCategory), currencySymbol)})`}
              </p>
            )}
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingBudget}>
                {addingBudget ? "Saving..." : "Save budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
