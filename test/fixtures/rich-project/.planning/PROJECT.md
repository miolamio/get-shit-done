# TaskFlow

## What This Is

TaskFlow is a modern task management application designed for small development teams. It provides real-time collaborative task boards with drag-and-drop prioritization, assignment tracking, and sprint planning — built as a full-stack Next.js application with PostgreSQL persistence.

## Core Value

Teams can create, assign, and track tasks in real-time with zero configuration — drag a task, see it move on every screen.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] FOUND-01: Project scaffolded with Next.js 14, TypeScript, and Tailwind
- [ ] FOUND-02: Database schema with User model connected via Prisma
- [ ] FOUND-03: Development environment runs without errors
- [ ] AUTH-01: Users can register and log in with email/password
- [ ] AUTH-02: Protected routes require valid JWT session

### Out of Scope

- OAuth/social login — Focus on email/password for v1, add social auth in v2
- Real-time WebSocket sync — Use polling for v1, upgrade to WebSocket in v2

## Context

- Greenfield project, no legacy constraints
- Target audience: 2-10 person dev teams
- Must work on latest Chrome, Firefox, Safari
- Will deploy to Vercel with managed PostgreSQL (Neon or Supabase)

## Constraints

- **Tech Stack**: Next.js 14 App Router, Prisma, PostgreSQL, Tailwind CSS — team has existing expertise
- **Timeline**: MVP in 2 weeks — focus on core task CRUD and auth
- **Performance**: Initial page load under 2s on 3G connection

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| App Router over Pages Router | Better server component support, layouts, streaming | ✓ Good |
| PostgreSQL over SQLite | Production-ready from day one, avoid migration later | ✓ Good |
| Prisma over raw SQL | Type-safe queries, migration management, team familiarity | — Pending |
| Tailwind over CSS Modules | Faster iteration, consistent design tokens | — Pending |

---
*Last updated: 2026-02-17 after Phase 1 completion*
