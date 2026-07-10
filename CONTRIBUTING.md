# Contributing to Rock 88.7 Broadcast Control Center

Thank you for your interest in contributing! This document outlines the process for contributing to the project.

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)

### Getting Started
```bash
# Clone the repository
git clone https://github.com/markec12345678/rivendellradio.git
cd rivendellradio
git checkout web-dashboard

# Install dependencies
bun install

# Set up the database
bun run db:push

# Start the dev server
bun run dev

# Start the WebSocket mini-service (in another terminal)
cd mini-services/broadcast-feed
bun install
bun run dev
```

### Docker (Alternative)
```bash
docker compose up -d
```

## Code Style

### TypeScript
- Use TypeScript 5 strict mode
- Prefer `type` for unions, `interface` for objects
- Use `import type` for type-only imports
- Avoid `any` — use `unknown` and narrow types

### React
- Use `'use client'` only where needed (components with state/effects)
- Use `force-dynamic` on all API routes
- Prefer shadcn/ui components over custom implementations
- Use Lucide icons (not emoji)
- Use Framer Motion for animations

### Styling
- Tailwind CSS 4 with shadcn/ui (New York style)
- Use CSS variables (`bg-primary`, `text-foreground`, etc.)
- Dark theme is the default — design for dark first
- No indigo or blue as primary colors (use amber/orange accent)

### API Routes
- All new APIs should be versioned: `/api/v1/*`
- Use `export const dynamic = 'force-dynamic'`
- Return JSON with consistent structure: `{ count, data, ... }`
- Add 100-200ms artificial delay for realistic loading states

### Event Bus
- New modules should subscribe to events, not call other modules directly
- Use `createEvent()` helper for publishing typed events
- Always include `correlationId` for cascading events
- Persist events to EventStore for replay capability

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `web-dashboard`: `git checkout -b feat/your-feature`
3. **Write code** following the style guide above
4. **Run lint**: `bun run lint`
5. **Test** your changes in the browser
6. **Commit** with conventional messages:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `refactor:` code refactoring
   - `chore:` maintenance
7. **Push** and open a Pull Request to `web-dashboard`

### PR Checklist
- [ ] Code follows style guidelines (ESLint passes)
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No secrets/tokens in code
- [ ] Mobile responsive (if UI change)
- [ ] No new warnings in dev server

## Clean-Room Policy

This project is a **clean-room implementation**. When contributing:

- **DO NOT** copy code from AzuraCast, LibreTime, RCS Zetta, or any other radio system
- **DO** write original code based on your understanding of how features should work
- **DO** reference public documentation and standards (EBU, RadioDNS, RDS)
- **DO NOT** use copyrighted album art, logos, or assets — use AI-generated or public domain

## Architecture Decisions

### Event-Driven Architecture
All modules communicate through the Event Bus. Do not add direct module-to-module calls.

### AI Modules
AI modules must:
- Subscribe to Event Bus events (not be called directly)
- Include metrics (runs, success rate, latency, cost)
- Support `presenterControl` or `producerControl` when applicable
- Never auto-play content without human approval for critical operations

### Database
- SQLite for development (Prisma ORM)
- All models in `prisma/schema.prisma`
- Run `bun run db:push` after schema changes

## Reporting Issues

When reporting issues, include:
1. Description of the problem
2. Steps to reproduce
3. Expected vs actual behavior
4. Browser and OS
5. Console errors (if any)
6. Screenshots (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the GPL-2.0 license.
