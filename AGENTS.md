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
