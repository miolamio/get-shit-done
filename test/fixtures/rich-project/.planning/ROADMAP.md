# Roadmap: TaskFlow

## Overview

Build a full-stack task management app from scaffolding through authentication, delivering a secure foundation for team collaboration features.

## Phases

- [x] **Phase 1: Foundation Setup** - Project scaffolding with Next.js, Prisma, and PostgreSQL
- [ ] **Phase 2: Authentication** - User registration, login, and session management

## Phase Details

### Phase 1: Foundation Setup
**Goal**: Establish project structure with working dev environment and database connection
**Depends on**: Nothing (first phase)
**Requirements**: [FOUND-01, FOUND-02, FOUND-03]
**Success Criteria** (what must be TRUE):
  1. Next.js dev server starts without errors
  2. Prisma connects to PostgreSQL and can query User model
  3. Tailwind CSS classes render correctly
**Plans**: 1 plan

Plans:
- [x] 01-01: Scaffold Next.js 14 app with Prisma and PostgreSQL

### Phase 2: Authentication
**Goal**: Users can register, log in, and access protected routes with JWT sessions
**Depends on**: Phase 1
**Requirements**: [AUTH-01, AUTH-02]
**Success Criteria** (what must be TRUE):
  1. User can register with email and password
  2. User can log in and receive a session token
  3. Protected API routes reject unauthenticated requests
**Plans**: 1 plan

Plans:
- [ ] 02-01: Implement JWT auth with registration and login

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Setup | 1/1 | Complete | 2026-02-17 |
| 2. Authentication | 0/1 | In progress | - |
