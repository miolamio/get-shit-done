# Requirements: TaskFlow

**Defined:** 2026-02-17
**Core Value:** Teams can create, assign, and track tasks in real-time with zero configuration

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Project scaffolded with Next.js 14, TypeScript, App Router, and Tailwind CSS
- [x] **FOUND-02**: Prisma ORM connected to PostgreSQL with User model defined
- [x] **FOUND-03**: Development environment starts without errors (`npm run dev`)

### Authentication

- [ ] **AUTH-01**: Users can register with email/password and log in to receive JWT session
- [ ] **AUTH-02**: Protected API routes and pages reject unauthenticated requests

## v2 Requirements

### Dashboard

- [ ] **DASH-01**: Task board with drag-and-drop columns (To Do, In Progress, Done)
- [ ] **DASH-02**: Real-time updates when teammates move tasks

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth/social login | Focus on email/password for v1; social auth deferred to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | In Progress |
| AUTH-02 | Phase 2 | In Progress |
| DASH-01 | — | Not Started |
| DASH-02 | — | Not Started |

**Coverage:**
- v1 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0
