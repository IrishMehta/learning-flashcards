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

## Add or update flashcards

Put the Turso credentials in the repository's ignored `.env` file:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
```

Prepare a JSON file with a top-level `cards` array. Each card must contain:

- `card_key`, `card_type`, `category`, `topic`, `difficulty`, `front`, and `answer` as non-empty strings
- `key_points`, `follow_up_questions`, and `common_mistakes` as arrays of strings
- `needs_review` as a boolean
- Optional `source_reference`, `review_reason`, and integer `question_id` values

Validate a file without changing Turso:

```bash
npm run import:flashcards -- path/to/cards.json --dry-run
```

Import it:

```bash
npm run import:flashcards -- path/to/cards.json
```

The importer upserts cards by `card_key`: new keys are inserted and existing keys are updated. Review history is kept because existing card rows retain their IDs. Re-running the same import is safe.

The importer also removes generated `:chatgpt-content-reference{...}` markers, which are not useful card content. Other malformed JSON is rejected before Turso is changed.
