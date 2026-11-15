/**
 * Temporary local data layer. The back end (API + database) is still being
 * built, so for now every /api/v1 request (axios or fetch) is answered here
 * from the starter records in ./data.json. Add / edit / delete work, but are
 * only kept in memory until the page is refreshed.
 * When the real API is ready, delete the import in lib/axios-defaults.ts.
 */
import axios from "axios"
import raw from "./data.json"

type Json = any
const SESSION_KEY = "pocketwise-session"

// ---- starter data, re-dated so it always looks like "this month" ----------
function monthsBetweenSnapshotAndNow() {
  const [sy, sm] = raw.snapshot.split("-").map(Number)
  const now = new Date()
  return now.getFullYear() * 12 + now.getMonth() - (sy * 12 + (sm - 1))
}

function shiftDateString(s: string, months: number) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?(.*)$/.exec(s)
  if (!m) return s
  const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + months
  const y = Math.floor(total / 12)
  const mo = total % 12
  const ym = `${y}-${String(mo + 1).padStart(2, "0")}`
  if (m[3] === undefined) return `${ym}${m[4]}`
  const last = new Date(y, mo + 1, 0).getDate()
  return `${ym}-${String(Math.min(Number(m[3]), last)).padStart(2, "0")}${m[4]}`
}

function shiftDeep(v: Json, months: number): Json {
  if (typeof v === "string") {
    return /^\d{4}-\d{2}(-\d{2})?(T[\d:.]+Z?)?$/.test(v) ? shiftDateString(v, months) : v
  }
  if (Array.isArray(v)) return v.map((x) => shiftDeep(x, months))
  if (v && typeof v === "object") {
    const o: Record<string, Json> = {}
    for (const k of Object.keys(v)) o[k] = shiftDeep(v[k], months)
    return o
  }
  return v
}

const shift = monthsBetweenSnapshotAndNow()
const store: Record<string, Json> = shift === 0 ? structuredClone(raw.routes) : shiftDeep(raw.routes, shift)
const currentUser: Json = shift === 0 ? structuredClone(raw.user) : shiftDeep(raw.user, shift)

// ---- helpers ---------------------------------------------------------------
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36)

const ok = (data: Json, status = 200) => ({ status, body: { data, error: null, requestId: uid() } })
const fail = (message: string, status: number) => ({
  status,
  body: { data: null, error: { message }, requestId: uid() },
})

function hasSession() {
  try {
    return localStorage.getItem(SESSION_KEY) === "1"
  } catch {
    return true
  }
}
function setSession(on: boolean) {
  try {
    if (on) localStorage.setItem(SESSION_KEY, "1")
    else localStorage.removeItem(SESSION_KEY)
  } catch {}
}

function parse(url: string) {
  const u = new URL(url, "http://local.api")
  return { path: u.pathname.replace(/\/+$/, ""), search: u.search }
}

function lookup(path: string, search: string) {
  if (store[`GET ${path}${search}`] !== undefined) return store[`GET ${path}${search}`]
  return store[`GET ${path}`]
}

function collectionFor(path: string): Json[] | null {
  const v = store[`GET ${path}`]
  return Array.isArray(v) ? v : null
}

function handle(method: string, url: string, body: Json) {
  const { path, search } = parse(url)
  const p = path.replace(/^.*?(\/api\/v1)/, "$1")

  // ---- auth ----
  if (p === "/api/v1/auth/me") return hasSession() ? ok({ user: currentUser }) : fail("Unauthorized", 401)
  if (/^\/api\/v1\/auth\/(login|register|google)$/.test(p)) {
    setSession(true)
    return ok({ user: currentUser })
  }
  if (p === "/api/v1/auth/logout") {
    setSession(false)
    return ok({})
  }
  if (/^\/api\/v1\/auth\/(forgot-password|reset-password|resend-verification|verify-email)$/.test(p)) {
    return ok({ message: "ok" })
  }
  if (!hasSession()) return fail("Unauthorized", 401)

  // ---- reads ----
  if (method === "GET") {
    const found = lookup(p, search)
    if (found !== undefined) return ok(structuredClone(found))
    // single item of a known collection, e.g. /goals/:id
    const i = p.lastIndexOf("/")
    const item = collectionFor(p.slice(0, i))?.find((x) => x?.id === p.slice(i + 1))
    if (item) return ok(structuredClone(item))
    return ok([])
  }

  // ---- writes: keep an in-memory copy so the UI reacts ----
  const i = p.lastIndexOf("/")
  const parentPath = p.slice(0, i)
  const lastSeg = p.slice(i + 1)

  if (method === "POST") {
    const list = collectionFor(p)
    if (list) {
      const now = new Date().toISOString()
      const item = { id: uid(), ...body, createdAt: now, updatedAt: now }
      list.unshift(item)
      return ok(item, 201)
    }
    return ok(body && typeof body === "object" ? { id: uid(), ...body } : {}, 201)
  }

  if (method === "PUT" || method === "PATCH") {
    const item = collectionFor(parentPath)?.find((x) => x?.id === lastSeg)
    if (item) {
      Object.assign(item, body, { updatedAt: new Date().toISOString() })
      return ok(structuredClone(item))
    }
    const cur = store[`GET ${p}`]
    if (cur && typeof cur === "object" && !Array.isArray(cur)) {
      Object.assign(cur, body)
      return ok(structuredClone(cur))
    }
    if (/^\/api\/v1\/users\/[^/]+$/.test(p)) {
      Object.assign(currentUser, body)
      return ok({ user: currentUser })
    }
    return ok(body ?? {})
  }

  if (method === "DELETE") {
    const list = collectionFor(parentPath)
    const idx = list ? list.findIndex((x) => x?.id === lastSeg) : -1
    if (list && idx >= 0) list.splice(idx, 1)
    return ok({})
  }

  return ok({})
}

// ---- install ---------------------------------------------------------------
let installed = false
export function installLocalApi() {
  if (installed || typeof window === "undefined") return
  installed = true

  axios.defaults.adapter = async (config: any) => {
    let body: Json = config.data
    if (typeof body === "string") {
      try {
        body = JSON.parse(body)
      } catch {}
    }
    const full = (config.baseURL ? config.baseURL.replace(/\/$/, "") : "") + (config.url || "")
    const params = config.params ? "?" + new URLSearchParams(config.params).toString() : ""
    const { status, body: data } = handle((config.method || "get").toUpperCase(), full + params, body)
    await new Promise((r) => setTimeout(r, 120)) // feels like a real network call
    const response = { data, status, statusText: String(status), headers: {}, config, request: {} }
    if (status >= 200 && status < 300) return response
    throw new axios.AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, {}, response as any)
  }

  const realFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (!/\/api\/v1\//.test(url)) return realFetch(input, init)
    let body: Json = init?.body
    if (typeof body === "string") {
      try {
        body = JSON.parse(body)
      } catch {}
    }
    const { status, body: data } = handle((init?.method || "GET").toUpperCase(), url, body)
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
  }
}

installLocalApi()
