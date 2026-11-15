"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

type Indicator = { x: number; y: number; w: number; h: number }

const DRAG_THRESHOLD = 4

// A glass highlight that slides under the active tab. Position and width are
// measured from the real tab, then moved with transform only, so the motion
// stays on the compositor and costs nothing on weak phones. The highlight can
// also be dragged: it follows the pointer, resizes to whichever tab it is over,
// and on release the tab under it becomes active.
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, forwardedRef) => {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [indicator, setIndicator] = React.useState<Indicator | null>(null)
  const [drag, setDrag] = React.useState<{ x: number; w: number } | null>(null)
  const [animate, setAnimate] = React.useState(false)

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [forwardedRef]
  )

  const measure = React.useCallback(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
    if (!list || !active) {
      setIndicator(null)
      return
    }
    setIndicator((prev) => {
      const next = { x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight }
      return prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next
    })
  }, [])

  useIsoLayoutEffect(() => {
    measure()
    const list = listRef.current
    if (!list) return
    const mutations = new MutationObserver(measure)
    mutations.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] })
    const resize = new ResizeObserver(measure)
    resize.observe(list)
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => {
      mutations.disconnect()
      resize.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [measure])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    props.onPointerDown?.(event)
    const list = listRef.current
    const startTab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]')
    if (event.button !== 0 || !list || !startTab || startTab.dataset.state !== "active") return
    const scrollable = list.scrollWidth > list.clientWidth + 1
    if (event.pointerType === "touch" && scrollable) return // let a scrolling tab bar scroll

    const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'))
    const toContentX = (clientX: number) => clientX - list.getBoundingClientRect().left + list.scrollLeft
    const startX = event.clientX
    const pillX = startTab.offsetLeft
    const pillW = startTab.offsetWidth
    const grabRatio = pillW > 0 ? (toContentX(event.clientX) - pillX) / pillW : 0.5
    let dragging = false
    let hovered: HTMLElement = startTab

    const hoveredAt = (contentX: number) =>
      tabs.reduce((best, tab) => {
        const center = tab.offsetLeft + tab.offsetWidth / 2
        const bestCenter = best.offsetLeft + best.offsetWidth / 2
        return Math.abs(center - contentX) < Math.abs(bestCenter - contentX) ? tab : best
      }, tabs[0] ?? startTab)

    const onMove = (e: PointerEvent) => {
      if (!dragging && Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return
      dragging = true
      const contentX = toContentX(e.clientX)
      hovered = hoveredAt(contentX)
      const w = hovered.offsetWidth
      const minX = tabs[0]?.offsetLeft ?? 0
      const maxX = (tabs[tabs.length - 1]?.offsetLeft ?? 0) + (tabs[tabs.length - 1]?.offsetWidth ?? 0) - w
      setDrag({ x: Math.min(maxX, Math.max(minX, contentX - grabRatio * w)), w })
    }

    const finish = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", finish)
      window.removeEventListener("pointercancel", finish)
      if (dragging && hovered !== startTab) hovered.focus({ preventScroll: true }) // Radix activates a tab on focus
      setDrag(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", finish)
    window.addEventListener("pointercancel", finish)
  }

  const shown = drag && indicator ? { ...indicator, x: drag.x, w: drag.w } : indicator

  return (
    <TabsPrimitive.List
      ref={setRefs}
      data-ind={indicator ? "" : undefined}
      data-dragging={drag ? "" : undefined}
      className={cn(
        "relative inline-flex h-10 select-none items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
      onPointerDown={handlePointerDown}
    >
      {shown && (
        <span
          aria-hidden
          className={cn("tab-indicator", !animate && "!transition-none")}
          style={{ transform: `translateX(${shown.x}px)`, top: shown.y, width: shown.w, height: shown.h }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:cursor-grab data-[state=active]:text-foreground",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
