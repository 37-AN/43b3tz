# AGENTS.md - 43V3R BET AI Development Guide

## Project Overview

This is a monorepo containing:
- **Frontend**: Next.js 16 with React 19, Tailwind CSS 4, TypeScript
- **Backend**: Fastify (Node.js) with TypeScript
- **Mini-services**: Various microservices (realtime-service, scraper-service, telegram-bot, ai-engine)
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)

---

## Build, Lint, and Test Commands

### Frontend (Root Directory)

```bash
# Development
npm run dev          # Start Next.js dev server on port 3000

# Build
npm run build        # Build for production (with standalone output)
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint on entire project

# Database (Prisma)
npm run db:push      # Push schema to database
npm run db:generate # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:reset     # Reset database
npm run db:seed      # Seed database
```

### Backend (`/backend`)

```bash
cd backend

# Development
npm run dev          # Start with ts-node (src/index.ts)

# Build
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled JavaScript

# Testing
# Run all tests with Jest
npx jest

# Run a single test file
npx jest tests/api.test.ts

# Run tests in watch mode
npx jest --watch

# Run tests with coverage
npx jest --coverage
```

### Mini-services

```bash
# Each service uses bun for hot reload
cd mini-services/[service-name]
npm run dev          # bun --hot index.ts
```

---

## Code Style Guidelines

### TypeScript Configuration

- **Frontend** (`tsconfig.json`): Strict mode enabled, `noImplicitAny: false`, module resolution: `bundler`
- **Backend**: Strict mode enabled, CommonJS modules

### Imports

```typescript
// Use path aliases (@/) for project imports
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store"

// Third-party imports first, then local
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
```

### Component Patterns

**UI Components (shadcn/ui style)**:
- Use `cva` (class-variance-authority) for variant props
- Export both component and variants
- Use `cn()` utility for class merging
- Use Radix UI primitives for accessibility

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: { default: "...", destructive: "..." },
      size: { default: "...", sm: "...", lg: "...", icon: "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
```

### State Management (Zustand)

```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email, password) => { /* ... */ },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "auth-storage", skipHydration: true }
  )
)
```

### Database (Prisma)

- Models defined in `prisma/schema.prisma`
- Use `@id`, `@default(cuid())`, `@unique`, `@relation`
- Index frequently queried fields with `@@index`
- Use enums for fixed string values

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  role      String   @default("user") // user, tipster, admin
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("users")
}
```

### Validation (Zod)

- Use Zod for runtime validation
- Define schemas in `backend/schema/` or `src/lib/validation.ts`

```typescript
import { z } from "zod"

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["user", "tipster", "admin"]).default("user"),
})
```

### Naming Conventions

- **Components**: PascalCase (`BetSlip.tsx`, `Sidebar.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuthStore`, `useHydrateStores`)
- **Utilities**: camelCase (`cn()`, `formatDate()`)
- **Types/Interfaces**: PascalCase (`interface MatchState`)
- **Files**: kebab-case for configs, PascalCase for components

### Error Handling

- Backend: Use try-catch with proper error logging (winston)
- Frontend: Use error boundaries and `sonner` for toasts
- API responses: Use consistent format (see `src/lib/api-response.ts`)

### ESLint Configuration

The project uses relaxed ESLint rules (see `eslint.config.mjs`):
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-unused-vars`: off
- `prefer-const`: off
- `no-console`: off

---

## Project Structure

```
43b3tz/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities (utils.ts, db.ts, auth.ts)
│   ├── middleware/       # Next.js middleware
│   ├── store/            # Zustand stores
│   └── types/            # TypeScript types
├── backend/              # Fastify API
│   ├── src/
│   │   ├── index.ts      # Entry point
│   │   ├── routes/       # API routes
│   │   ├── schema/       # Zod schemas
│   │   ├── utils/        # Utilities
│   │   └── jobs/         # Background jobs
│   └── tests/            # Jest tests
├── prisma/
│   └── schema.prisma     # Database schema
├── mini-services/       # Microservices
│   ├── realtime-service/
│   ├── scraper-service/
│   ├── telegram-bot/
│   └── ai-engine/
└── package.json          # Root dependencies
```

---

## Common Tasks

### Running a Specific Test

```bash
# Backend
cd backend
npx jest tests/api.test.ts

# Run specific test
npx jest tests/api.test.ts -t "should flag predictions"
```

### Adding a New UI Component

1. Create component in `src/components/ui/`
2. Use CVA for variants
3. Export component and variants
4. Use `cn()` for class merging

### Adding a New Store

1. Create in `src/store/index.ts` or separate file
2. Use Zustand with TypeScript interfaces
3. Add persist middleware for persistence
4. Export hooks for consumption

### Database Changes

1. Edit `prisma/schema.prisma`
2. Run `npm run db:generate`
3. Run `npm run db:push` (dev) or `npm run db:migrate` (prod)

---

## Environment Variables

- `.env` file at root for frontend
- Backend uses `dotenv` - check for `.env` in `backend/`
- Database URL in `DATABASE_URL`
- Supabase keys in `SUPABASE_*` variables

## Claude-Mem Integration

Antigravity is configured to use Claude-Mem for persistent memory.
1. When you need historical context, use the `claude-mem` MCP tools (if loaded) or search via API: `curl -s "http://127.0.0.1:37777/api/search/observations?query=<query>"`
2. When you discover new insights, bugs, or finish a task, save an observation:
   ```bash
   session_id="antigravity-$(date +%s)"
   curl -s -X POST http://127.0.0.1:37777/api/sessions/init -H "Content-Type: application/json" -d '{"contentSessionId": "'$session_id'", "project": "43b3tz", "prompt": "Antigravity update"}'
   curl -s -X POST http://127.0.0.1:37777/api/sessions/observations \
     -H "Content-Type: application/json" \
     -d '{
       "contentSessionId": "'$session_id'",
       "tool_name": "AntigravityMemory",
       "tool_input": { "message": "YOUR TEXT HERE" },
       "tool_response": { "status": "ok" },
       "cwd": "'$(pwd)'"
     }'
   curl -s -X POST http://127.0.0.1:37777/api/sessions/complete -H "Content-Type: application/json" -d '{"contentSessionId": "'$session_id'"}'
   ```

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **43b3tz** (1412 symbols, 3372 relationships, 112 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/43b3tz/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/43b3tz/context` | Codebase overview, check index freshness |
| `gitnexus://repo/43b3tz/clusters` | All functional areas |
| `gitnexus://repo/43b3tz/processes` | All execution flows |
| `gitnexus://repo/43b3tz/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
