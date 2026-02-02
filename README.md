# Micro-SI Intake

A Next.js App Router intake form that submits a normalized blueprint, emails the intake, and redirects to a Blueprint Summary page for review.

## What it does
- Intake form collects CRM + contact center requirements
- Normalized JSON is submitted to `/api/intake` and emailed via Resend
- After submit, a Blueprint Summary page renders the stored blueprint (localStorage)

## Local development
```bash
npm install
npm run dev
```

## Deployment (Vercel)
Set the following environment variables in Vercel:
- `RESEND_API_KEY`
- `INTAKE_RECEIVER_EMAIL`

## Notes
- Blueprint Summary reads from browser `localStorage`, so it is only viewable in the same browser/device that submitted the intake.
- Prototype for evaluation & feedback only.
