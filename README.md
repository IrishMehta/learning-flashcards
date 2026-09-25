# Career Flashcards

Standalone Vite + Vercel application backed by Turso.

## Environment variables

Set these locally in `.env.local` and in the Vercel project:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
```

## Commands

```bash
npm install
npm run check
npm run build
```

Use `vercel dev` when testing the frontend and API routes together locally.
