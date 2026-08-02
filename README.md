# Future Mind Global

A global learning, assessment, and recognition platform for the human capabilities that shape the future.

## Included

- Public Future Mind Global experience
- Six-capability learning framework
- Age-based pathways and sample assessment
- Certificate verification experience
- Protected administration console
- Supabase email/password authentication
- Participant, reviewer, editor, and administrator roles
- PostgreSQL schema for challenges, questions, attempts, results, certificates, settings, and audit logs
- Row-level security policies

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set these public values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never place a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable.

## Database

The production schema is versioned in [`supabase/migrations`](supabase/migrations). Apply migrations to a new Supabase project with the Supabase CLI or through your controlled deployment process.

All new accounts begin with the `participant` role. Promote administrators through a trusted database-management surface; never allow users to assign their own roles.

## Routes

- `/` — public website
- `/admin/login` — secure administrator sign-in and account creation
- `/admin` — role-protected administration console

## Validation

```bash
npm run build
```

## Deployment

The current production version is hosted with OpenAI Sites. The same source can also be connected to another compatible deployment platform using the environment variables above.
