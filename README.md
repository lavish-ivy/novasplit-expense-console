# NovaSplit Expense Console

A futuristic, local-first expense splitting app built as a static SPA. It tracks groups, people, shared expenses in INR, custom splits, optimized settlements, balance visualizations, category totals, and JSON export.

## Features

- Multi-group expense tracking
- Rupee-first money display across the app
- Device accounts with separate saved ledgers
- Equal and custom splits
- Optimized settlement suggestions
- One-click settlement recording
- LocalStorage persistence
- Exportable JSON ledger
- Responsive dashboard UI
- No build step and no runtime backend

## Accounts

NovaSplit supports account creation and sign-in on the static GitHub Pages app. Ledgers are saved per account in the browser with a hashed password check, so multiple people can keep separate data on the same device.

This is device-local persistence, not cloud sync. To save data across devices, connect a backend such as Supabase or Firebase and map the existing account and ledger storage layer to that provider.

## Run Locally

Open `index.html` directly in a browser, or serve the folder with any static file server.

```bash
python3 -m http.server 4173
```

## Validate

```bash
npm run check
npm test
```

## Deploy

This repo is GitHub Pages ready. Publish the folder to GitHub, then enable Pages from the repository root on the default branch.
