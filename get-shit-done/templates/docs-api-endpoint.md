# API Endpoint Documentation Template

Template for generating API endpoint documentation in `docs/api/`. One file per endpoint group (e.g., auth, users, posts).

---

## File Template

Each endpoint group is a separate file: `docs/api/{{group}}.md`

```markdown
# {{GROUP_NAME}} API

{{GROUP_DESCRIPTION — Brief description of this endpoint group's purpose.}}

**Base URL:** `{{BASE_URL}}`
**Authentication:** {{AUTH_REQUIREMENT — e.g., "Bearer token required" or "Public"}}

---

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| {{METHOD}} | `{{PATH}}` | {{Brief description}} | {{Yes/No}} |

---

## {{METHOD}} {{PATH}}

{{ENDPOINT_DESCRIPTION}}

### Request

**Headers:**

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer {{token}}` | {{Yes/No}} |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `{{param}}` | `{{type}}` | {{Description}} |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `{{param}}` | `{{type}}` | `{{default}}` | {{Description}} |

**Request Body:**

```json
{
  "{{field}}": "{{type}} — {{description}}"
}
```

### Response

**Success ({{STATUS_CODE}}):**

```json
{
  "{{field}}": "{{type}} — {{description}}"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| `400` | `{{ERROR_CODE}}` | {{Description}} |
| `401` | `unauthorized` | Authentication required |
| `404` | `not_found` | Resource not found |
| `422` | `validation_error` | Invalid request body |

### Example

**Request:**

```bash
curl -X {{METHOD}} {{BASE_URL}}{{PATH}} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{{REQUEST_BODY_JSON}}'
```

**Response:**

```json
{{RESPONSE_BODY_JSON}}
```

---

{{Repeat for each endpoint in this group.}}
```

## Index Template

Create `docs/api/README.md` as an index:

```markdown
# API Reference

{{PROJECT_NAME}} API documentation. Generated from source code analysis.

## Endpoint Groups

| Group | Endpoints | Description |
|-------|-----------|-------------|
| [{{Group}}]({{filename}}) | {{count}} | {{Description}} |

## Authentication

{{AUTH_OVERVIEW — How authentication works in this API. Extract from auth route handlers, middleware, or SUMMARY.md auth-related accomplishments.}}

## Common Patterns

### Pagination

{{PAGINATION — If pagination patterns exist in the codebase, document them here.}}

### Error Format

{{ERROR_FORMAT — Standard error response format used across endpoints.}}

```json
{
  "error": {
    "code": "{{error_code}}",
    "message": "{{Human-readable message}}"
  }
}
```

## Rate Limiting

{{RATE_LIMITING — If rate limiting exists, document it. Otherwise omit this section.}}
```

<guidelines>

**Source endpoints from:**
1. **Route files** — Scan for route handlers (Express routes, Next.js API routes, FastAPI endpoints, etc.)
2. **Controller files** — Extract request/response shapes from handler implementations
3. **Middleware** — Identify auth requirements, validation, rate limiting
4. **Type definitions** — Extract request/response types from TypeScript interfaces, Zod schemas, or similar
5. **SUMMARY.md** — Cross-reference with implemented features for descriptions

**Endpoint discovery patterns:**
- Express: `app.get()`, `app.post()`, `router.get()`, etc.
- Next.js: `app/api/*/route.ts` files with exported `GET`, `POST`, etc.
- FastAPI: `@app.get()`, `@app.post()`, `@router.get()`, etc.
- Other: Scan for route registration patterns in the framework

**Grouping:**
- Group by resource (users, posts, comments) or domain (auth, content, social)
- One file per group
- Keep related CRUD operations together

**Request/response shapes:**
- Extract from actual type definitions, not invented
- Include all required fields
- Mark optional fields
- Show realistic example values (not "string" but "john@example.com")

**Section inclusion:**
- Omit Path Parameters if no path params
- Omit Query Parameters if no query params
- Omit Request Body for GET/DELETE without body
- Always include at least one curl example per endpoint

**What to exclude:**
- Internal/admin endpoints unless explicitly public
- Health check endpoints (unless part of the public API)
- Debug/development-only endpoints

</guidelines>
