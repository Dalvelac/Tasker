# Tasker

Tasker is an open-source personal productivity and scheduling web application built to organize tasks, sections, daily planning, calendar views and productivity statistics from a single private dashboard.

The project is designed as a lightweight alternative to a traditional to-do app: it combines a task manager, a daily planner, a calendar summary, a quick inbox, an unscheduled task queue, recurring task support and a GitHub-style productivity heatmap.

> The application source code lives inside [`tasker-web/`](./tasker-web).

---

## Table of contents

- [Overview](#overview)
- [Current features](#current-features)
- [Application views](#application-views)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [API overview](#api-overview)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Local setup](#local-setup)
- [Database setup](#database-setup)
- [Running locally](#running-locally)
- [Deployment](#deployment)
- [Privacy and security](#privacy-and-security)
- [Development workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## Overview

Tasker is built around a simple idea: tasks should be easy to capture quickly, but also easy to organize later by day, section, priority and workflow context.

The application currently supports:

- sections for organizing areas of life or projects;
- tasks with optional dates, times, priorities and statuses;
- time blocks for scheduled work sessions;
- an inbox for quick capture;
- unscheduled tasks for items without a date;
- daily planning through a Today view and Plan My Day view;
- upcoming and overdue views;
- recurring tasks with automatic next-instance generation;
- productivity statistics and a GitHub-style heatmap;
- keyboard shortcuts for fast navigation and actions.

Tasker is intended to be deployed privately. The source code can remain public, while the deployed app can be protected behind Cloudflare Access or another authentication layer.

---

## Current features

### Task management

- Create, update, delete and complete tasks.
- Reopen completed tasks.
- Assign tasks to sections.
- Add notes to tasks.
- Set optional dates.
- Set optional start and end times.
- Use optional duration values.
- Use all-day tasks.
- Classify tasks by period of the day: morning, afternoon or night.
- Use task types: `task`, `event` and `time_block`.
- Use priorities: `low`, `normal`, `high` and `urgent`.
- Use statuses: `pending`, `in_progress`, `done`, `cancelled` and `postponed`.

### Sections

- Create sections with name, slug, color, icon and description.
- Update section metadata.
- Delete sections safely.
- When a section is deleted, its tasks are not deleted; they are moved back to an unassigned state.
- Sections expose a pending task count.

### Planning views

- Dashboard.
- Today Command Center.
- Plan My Day.
- Stacked Planner.
- Calendar.
- Next 7 Days.
- Overdue.
- Inbox.
- Unscheduled.
- Sections.
- Shortcuts.

### Statistics

- Productivity heatmap based on completed tasks.
- Completed tasks today.
- Completed tasks in the last 7 days.
- Total pending tasks.
- Current completion streak.
- Section-level completed and pending counts.

### Recurring tasks

Tasker supports basic recurring tasks:

- daily;
- weekly;
- monthly.

When a recurring task is completed, the backend creates the next pending instance automatically, as long as the recurrence has not reached its optional end date.

---

## Application views

The frontend navigation is grouped into four areas: Daily, Planning, Organize and System.

### Dashboard

The main landing view. It is intended to provide a high-level overview of productivity and task activity.

Typical dashboard content includes:

- task summary;
- productivity heatmap;
- section activity;
- pending task overview;
- quick access to the most important workflows.

### Today

The Today view is focused on the current day.

It is used to see what should be done today, mark tasks as complete, and quickly jump into daily planning.

### Plan My Day

Plan My Day is a dedicated planning workflow for deciding what should be worked on today.

The idea is to help move tasks from unscheduled, overdue or pending states into a realistic daily plan.

### Stacked Planner

The Stacked Planner groups tasks chronologically by day.

Instead of showing a full calendar grid, it presents the schedule as a readable list, making it easier to see what is coming next.

### Calendar

The Calendar view provides a more visual summary of scheduled tasks and events.

Tasks can be represented by date and section color.

### Next 7 Days

The upcoming view focuses on near-term planning by showing tasks scheduled for the next week.

### Overdue

The overdue view isolates tasks that should already have been completed.

### Inbox

Inbox is for fast capture.

Use it when a task is not organized yet. Inbox tasks usually have no section or final date when they are first created.

### Unscheduled

Unscheduled contains tasks without a date.

This is useful for storing things that matter, but do not belong to a specific day yet.

### Sections

The Sections view manages the organizational areas used across the app.

Examples of default sections include:

- Universidad;
- Cybersecurity;
- Gym;
- Personal;
- Trabajo;
- Proyectos;
- Erasmus;
- Salud;
- Finanzas.

### Shortcuts

The Shortcuts view displays and manages keyboard shortcuts. Shortcuts are stored locally in the browser using `localStorage`.

---

## Tech stack

Tasker is built with:

- **React** for the UI;
- **TypeScript** for type safety;
- **Vite** for development and builds;
- **Cloudflare Pages Functions** for backend API routes;
- **Cloudflare D1** as the database;
- **Wrangler** for local Cloudflare tooling and deployment;
- **CSS modules/files** using a custom dark design system.

The app is intentionally lightweight and does not require a traditional always-on Node.js server when deployed to Cloudflare Pages.

---

## Project structure

```txt
.
├── README.md
└── tasker-web/
    ├── functions/
    │   ├── _shared/
    │   │   ├── db.ts
    │   │   ├── http.ts
    │   │   └── validation.ts
    │   └── api/
    │       ├── sections/
    │       ├── stats/
    │       └── tasks/
    ├── migrations/
    ├── public/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── features/
    │   ├── lib/
    │   ├── styles/
    │   └── views/
    ├── schema.sql
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── wrangler.toml
```

### Important folders

#### `tasker-web/functions/`

Contains Cloudflare Pages Functions.

These files are the backend API layer. They receive HTTP requests from the frontend, validate input, query D1 and return JSON responses.

#### `tasker-web/functions/_shared/`

Shared backend utilities:

- `db.ts`: D1 and request context types.
- `http.ts`: response helpers and request parsing helpers.
- `validation.ts`: input validation and normalization helpers.

#### `tasker-web/functions/api/`

API route handlers.

Current API areas include:

- `sections`: section CRUD operations;
- `tasks`: task listing, creation, update, deletion and toggling;
- `stats`: productivity statistics and heatmap data.

#### `tasker-web/src/app/`

Application root and navigation definition.

`App.tsx` handles:

- active view state;
- loading data from the API;
- task and section mutations;
- global keyboard shortcuts;
- undo stack;
- quick add modal;
- recurrence modal;
- search modal;
- shortcut overlay.

#### `tasker-web/src/features/`

Domain-specific frontend logic.

Examples:

- `tasks`: task API client and types;
- `sections`: section API client and types;
- `stats`: statistics API client and types;
- `shortcuts.ts`: shortcut definitions, defaults and local storage helpers.

#### `tasker-web/src/views/`

Top-level views rendered by the app shell.

Examples:

- `DashboardView.tsx`;
- `TodayView.tsx`;
- `PlanMyDayView.tsx`;
- `StackedPlannerView.tsx`;
- `CalendarView.tsx`;
- `InboxView.tsx`;
- `UnscheduledView.tsx`;
- `SectionsView.tsx`;
- `ShortcutsView.tsx`.

#### `tasker-web/src/styles/`

Global CSS files.

The design system is based on a dark productivity-dashboard style with CSS variables for backgrounds, cards, borders, typography, status colors and heatmap colors.

---

## Data model

The current database schema is defined in [`tasker-web/schema.sql`](./tasker-web/schema.sql).

### `sections`

Stores organizational areas.

| Column | Description |
| --- | --- |
| `id` | Primary key. |
| `name` | Human-readable section name. |
| `slug` | Unique URL-safe identifier generated from the name. |
| `color` | Section color used by the UI. |
| `icon` | Optional icon identifier. |
| `description` | Optional description. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

### `tasks`

Stores tasks, events and time blocks.

| Column | Description |
| --- | --- |
| `id` | Primary key. |
| `title` | Required task title. |
| `notes` | Optional notes. |
| `section_id` | Optional section reference. |
| `date` | Optional scheduled date. |
| `due_date` | Mirrors the scheduled date for compatibility/querying. |
| `start_time` | Optional start time. |
| `end_time` | Optional end time. |
| `duration_minutes` | Optional or calculated duration. |
| `priority` | `low`, `normal`, `high` or `urgent`. |
| `status` | `pending`, `in_progress`, `done`, `cancelled` or `postponed`. |
| `type` | `task`, `event` or `time_block`. |
| `is_all_day` | Whether the task should be treated as all-day. |
| `day_period` | `morning`, `afternoon` or `night`. |
| `recurrence_rule` | Reserved recurrence rule field. |
| `recurrence_type` | `daily`, `weekly` or `monthly`. |
| `recurrence_interval` | Recurrence interval. |
| `recurrence_days` | Reserved for custom recurrence days. |
| `recurrence_until` | Optional recurrence end date. |
| `parent_task_id` | Parent task for generated recurring instances. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |
| `completed_at` | Completion timestamp. |

### `tags` and `task_tags`

The schema includes tag tables for future expansion.

Tags are useful for cross-section filtering, for example:

- `study`;
- `urgent-admin`;
- `deep-work`;
- `errand`.

---

## API overview

The frontend talks to the backend through relative `/api/...` routes.

All successful API responses use a JSON envelope:

```json
{
  "data": {}
}
```

The frontend helper in `src/lib/api.ts` unwraps `data` and throws an error when the response is not successful.

### Task endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/tasks` | List tasks. Supports filters. |
| `POST` | `/api/tasks` | Create a task. |
| `PATCH` | `/api/tasks/:id` | Update a task. |
| `DELETE` | `/api/tasks/:id` | Delete a task. |
| `PATCH` | `/api/tasks/:id/toggle` | Complete or reopen a task. |

Supported task filters include:

- `sectionId`;
- `status`;
- `priority`;
- `date`;
- `from`;
- `to`;
- `inbox=true`;
- `unscheduled=true`;
- `includeDone=true`.

### Section endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/sections` | List sections with pending counts. |
| `POST` | `/api/sections` | Create a section. |
| `PATCH` | `/api/sections/:id` | Update a section. |
| `DELETE` | `/api/sections/:id` | Delete a section and unassign its tasks. |

### Stats endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/stats/overview?days=180` | Return heatmap data, section stats and totals. |

The `days` parameter is capped to a safe range. The stats endpoint calculates:

- completed tasks per day;
- completed tasks today;
- completed tasks this week;
- pending task total;
- current completion streak;
- top active section.

---

## Keyboard shortcuts

Tasker includes global keyboard shortcuts and hovered-task shortcuts.

### Navigation

Number keys move between navigation items:

| Shortcut | Action |
| --- | --- |
| `1` | First navigation item. |
| `2` | Second navigation item. |
| `3` | Third navigation item. |
| `...` | Continue through the sidebar items. |
| `0` | Tenth navigation item. |

### Global shortcuts

| Shortcut | Action |
| --- | --- |
| `?` | Show all shortcuts. |
| `Ctrl + Shift + A` | Quick add new task. |
| `Ctrl + Shift + P` | Open Plan My Day. |
| `Ctrl + K` | Open search. |
| `Ctrl + R` | Configure recurrence for hovered task. |
| `Ctrl + Z` | Undo last task action. |
| `V` | Show/hide completed tasks. |

### Hovered task shortcuts

These shortcuts apply to the task currently hovered in the UI.

| Shortcut | Action |
| --- | --- |
| `Space` | Complete or reopen hovered task. |
| `H` | Move hovered task to today. |
| `M` | Move hovered task to tomorrow. |
| `Delete` | Delete hovered task. |

Shortcuts can be customized in the Shortcuts view and are stored in browser `localStorage`.

---

## Local setup

### Requirements

Install:

- Node.js;
- npm;
- a Cloudflare account if you want to use D1/Pages locally or deploy;
- Wrangler, installed through the project dev dependencies.

The repository uses Vite, TypeScript and Wrangler from `tasker-web/package.json`.

### Clone the repository

```bash
git clone https://github.com/Dalvelac/Tasker.git
cd Tasker/tasker-web
```

### Install dependencies

```bash
npm install
```

### Check the project builds

```bash
npm run build
```

This runs TypeScript build checks and then builds the Vite app into `dist/`.

---

## Database setup

Tasker uses Cloudflare D1.

The app expects a D1 binding named:

```txt
DB
```

The current Wrangler configuration uses:

```toml
[[d1_databases]]
binding = "DB"
database_name = "tasker-db"
```

### Create a D1 database

If you are setting up your own copy, create a D1 database:

```bash
npx wrangler login
npx wrangler d1 create tasker-db
```

Wrangler will return a `database_id`. Put that value in `tasker-web/wrangler.toml`.

### Apply the schema locally

```bash
npx wrangler d1 execute tasker-db --local --file=./schema.sql
```

### Apply the schema remotely

```bash
npx wrangler d1 execute tasker-db --remote --file=./schema.sql
```

Run the remote command before using the production deployment for the first time.

---

## Running locally

There are two useful local development modes.

### 1. Frontend-only Vite mode

```bash
npm run dev
```

This starts the Vite dev server.

Use this when you are working mainly on UI components. API calls to `/api/...` require the Cloudflare Pages Functions environment, so full backend functionality may not work in this mode unless you proxy or mock the API.

### 2. Full Cloudflare Pages local mode

Build the frontend first:

```bash
npm run build
```

Then run Pages locally:

```bash
npx wrangler pages dev dist
```

This is the preferred local mode when testing:

- Pages Functions;
- D1 access;
- API routes;
- frontend/backend integration.

If D1 is not available locally, make sure:

1. `wrangler.toml` exists in `tasker-web/`;
2. the D1 binding is named `DB`;
3. the local schema has been applied with `wrangler d1 execute --local`.

---

## Deployment

Tasker does not require a traditional server if it is deployed to Cloudflare Pages.

This is recommended if you do not have your own server running 24/7.

Cloudflare Pages can host:

- the static Vite frontend;
- the backend API through Pages Functions;
- the database through Cloudflare D1 bindings.

This means you can run the whole application without maintaining a VPS, reverse proxy, SSL certificates, system services or a continuously running Node.js process.

### Deploy with Wrangler Direct Upload

From `tasker-web/`:

```bash
npm run build
npx wrangler pages deploy dist --project-name tasker-web
```

After deployment, Cloudflare will provide a `*.pages.dev` URL.

### Add a custom domain

In Cloudflare:

```txt
Workers & Pages
→ tasker-web
→ Custom domains
→ Add custom domain
```

Example custom domain:

```txt
tasker.m4cro.dev
```

If the domain is managed by Cloudflare, the DNS record can usually be created automatically.

If it must be created manually, use a CNAME record:

```txt
Type: CNAME
Name: tasker
Target: tasker-web.pages.dev
Proxy: enabled
TTL: Auto
```

### Update an existing deployment

Whenever the code changes:

```bash
npm run build
npx wrangler pages deploy dist --project-name tasker-web
```

### Optional: GitHub Actions deployment

If Cloudflare's GitHub integration is not used, GitHub Actions can deploy through Wrangler Direct Upload.

A typical workflow is:

1. push to `main`;
2. install dependencies;
3. run `npm run build`;
4. run `wrangler pages deploy dist` using Cloudflare secrets.

Required GitHub Actions secrets usually include:

- `CLOUDFLARE_API_TOKEN`;
- `CLOUDFLARE_ACCOUNT_ID`.

Do not commit Cloudflare API tokens to the repository.

---

## Privacy and security

This repository can be public, but the deployed app should be protected if it contains personal tasks or calendar data.

### Recommended production protection

Use Cloudflare Access in front of the deployed app.

Recommended setup:

```txt
tasker.m4cro.dev
→ Cloudflare Access
→ allow only your email or identity provider account
→ Tasker app
```

For a private personal deployment, use one of these:

- Cloudflare Access with email OTP allowlisted to your exact email;
- Cloudflare Access with GitHub/Google login;
- Cloudflare Access combined with strong 2FA/passkeys on the identity provider;
- Cloudflare WARP/device posture checks for stricter device-based access.

### Protect the Pages domain too

If the app is available at both:

```txt
tasker.m4cro.dev
tasker-web.pages.dev
```

make sure the `*.pages.dev` hostname is also protected or disabled where possible.

Otherwise, the custom domain may be protected while the raw Pages URL remains accessible.

### Do not commit secrets

Never commit:

- `.env`;
- `.dev.vars`;
- Cloudflare API tokens;
- session secrets;
- OAuth client secrets;
- production database dumps;
- local SQLite files;
- private notes or real exported task data.

Recommended `.gitignore` entries:

```gitignore
node_modules
dist
.env
.dev.vars
.wrangler
*.db
*.sqlite
*.sqlite3
```

The D1 `database_id` in Wrangler config is not a password by itself, but Cloudflare API tokens and account credentials must always remain private.

---

## Development workflow

A simple workflow for local development:

```bash
cd tasker-web
npm install
npm run build
npx wrangler pages dev dist
```

A simple workflow for deployment:

```bash
cd tasker-web
npm run build
npx wrangler pages deploy dist --project-name tasker-web
```

A simple Git workflow:

```bash
git add .
git commit -m "describe your change"
git push origin main
```

---

## Design system

Tasker uses a dark productivity-dashboard theme.

Main tokens include:

| Token | Value |
| --- | --- |
| Background | `#0b0f14` |
| Secondary background | `#111827` |
| Card | `#161e2e` |
| Card hover | `#1e293b` |
| Border | `#2a3441` |
| Primary text | `#e5e7eb` |
| Secondary text | `#9ca3af` |
| Accent | `#38bdf8` |
| Success | `#22c55e` |
| Warning | `#f59e0b` |
| Danger | `#ef4444` |
| Urgent | `#f43f5e` |

Fonts:

- `Inter` for the main interface;
- `JetBrains Mono` for technical metadata, dates, times and statistics.

The productivity heatmap uses GitHub-style contribution colors.

---

## Troubleshooting

### `npm run build` fails

Check:

```bash
npm install
npm run lint
npm run build
```

Common causes:

- missing dependencies;
- TypeScript errors;
- incorrect imports;
- files renamed without updating imports.

### API requests fail locally

If `/api/...` routes fail in Vite mode, use Cloudflare Pages local mode instead:

```bash
npm run build
npx wrangler pages dev dist
```

### D1 binding is missing

Make sure:

- `wrangler.toml` is inside `tasker-web/`;
- the binding is named `DB`;
- the database exists in Cloudflare;
- the schema has been applied;
- you are running commands from `tasker-web/`.

### Tables do not exist

Apply the schema:

```bash
npx wrangler d1 execute tasker-db --local --file=./schema.sql
```

For production:

```bash
npx wrangler d1 execute tasker-db --remote --file=./schema.sql
```

### Custom domain works but is not private

Add a Cloudflare Access application for the custom domain.

Also check the raw Pages domain:

```txt
tasker-web.pages.dev
```

If it loads without authentication, protect that hostname too.

### Changes are not visible after deployment

Run:

```bash
npm run build
npx wrangler pages deploy dist --project-name tasker-web
```

Then hard refresh the browser or clear the Cloudflare/browser cache if needed.

---

## Roadmap

Possible future improvements:

- drag and drop tasks between days;
- richer calendar week/day views;
- better recurrence rules with custom weekdays;
- tag UI and tag-based filtering;
- import/export JSON;
- recurring task series management;
- reminders and notifications;
- mobile-first improvements;
- Cloudflare Access identity display inside the app;
- GitHub Actions deployment workflow;
- optional Google Calendar integration;
- ESP32 desk dashboard integration;
- AI-assisted planning.

---

## License

No license has been selected yet.

If this project is intended to be fully open-source, add a license such as MIT, Apache-2.0 or GPL-3.0.

---

## Author

Built by [Daniel Alves](https://github.com/Dalvelac).
