# Lead Intake System

This is the first Paideia demo scenario: a small lead intake system whose generated runtime remains inspectable.

The resource declaration in `src/index.ts` defines:

- fields: name, email, status, notes
- local browser persistence
- public create/update permissions
- admin-only deletion
- authenticated-only AI summary
- declared update actions
- an explicit AI action

Run it from the repo root:

```bash
npm run dev
```

Then open the local URL, create a lead, try the restricted AI summary, and inspect the browser log, CLI events, `dist/system.json`, `dist/schema.sql`, and `/__paideia/runtime`.
