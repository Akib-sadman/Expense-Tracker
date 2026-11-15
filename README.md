# Pocketwise

A personal and family finance tracker for the web. Record income and expenses, plan monthly
budgets, set savings goals, keep track of bills, subscriptions and debts, split costs with
friends, and see where your money goes through charts and reports.

**Status: work in progress.** The user interface is built; the back end (API + database) is
the next stage. Until then the app runs on a temporary local data layer, so everything you
add or change is kept only until the page is refreshed.

---

## How to run it (step by step)

**1. Install Node.js** (once). Download the LTS version from https://nodejs.org and install it.
Check it worked by opening a terminal and typing `node -v` (should show v18 or higher).

**2. Open a terminal inside the `pocketwise` folder.**
In VS Code: *File → Open Folder → pocketwise*, then *Terminal → New Terminal*.

**3. Install the packages** (once, takes about a minute):

```bash
npm install
```

**4. Start the app:**

```bash
npm run dev
```

**5. Open http://localhost:3000 in your browser.**

**6. Log in.** Type any email and any password on the login page and press *Sign In*
(for example `akib@example.com` / `password123`). To create an account instead, use the
*Sign up* link, which also accepts any details (password: 8+ characters).

To stop the app, press `Ctrl + C` in the terminal.

### If something goes wrong

| Problem | Fix |
|---|---|
| `npm` is not recognised | Node.js isn't installed, or reopen the terminal after installing it |
| Port 3000 already in use | Run `npm run dev -- -p 3001` and open http://localhost:3001 |
| Blank or broken page after editing files | Stop the app (`Ctrl + C`), delete the `.next` folder, run `npm run dev` again |
| Red errors after `npm install` | Delete `node_modules`, then run `npm install` again |

---

## What's inside

| Page | What it does |
|---|---|
| Home (dashboard) | Balance, income / expense summary, daily spending chart, budget usage |
| Planning | Budgets, savings goals, bills, subscriptions, debts, accounts |
| Insights | Spending analysis, trends, category breakdown, reports |
| Family | Shared household budgets and goals |
| AI | Spending alerts and assistant |
| Splitly | Split expenses with friends and settle up |
| Import / Export | Bring in or download transactions |
| Settings | Profile, currency, theme (light / dark), language |

Use **Add transaction** (top right) to record a new expense.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS, Radix UI components, lucide-react icons
- Recharts for charts
- axios for API calls

Planned for the next stage: Node.js + Express REST API and a PostgreSQL database.

## Project layout

```
app/                    routes only: one folder per page, thin wrappers
components/
  screens/              the main screens (dashboard, bills, goals, ...)
  layout/               app shell, sidebar, bottom nav, menus, quick add
  auth/                 auth guard, sign-in page, Google button
  common/               shared helpers (providers, redirects, modals)
  expenses/             add-expense modal
  ai/ insights/ settings/ splitly/ ...   feature-specific pieces
  ui/                   base UI primitives (shadcn/Radix)
contexts/               app state: auth, expenses, bills, goals, ...
hooks/                  reusable React hooks
lib/                    helpers (currency, categories, dates, i18n)
lib/api/                API clients, base URL, axios setup
lib/local-api/          temporary local data layer until the back end is ready
```
