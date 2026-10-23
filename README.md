# QueryVault — SQL Troubleshooting Toolkit

A polished, local-first toolkit for SQL snippets, Oracle error quick references, safe execution checklists, and incident notes. Built with plain HTML, CSS, and JavaScript—no build step, package installation, or backend required.

## Run it

1. Download and extract the `queryvault.zip` archive.
2. Open the `queryvault` folder.
3. Double-click `index.html` to open it in a modern browser.

For the most consistent local storage behavior, you can optionally serve the folder using VS Code's Live Server extension. There is no `npm install` step.

## Features

- **SQL Library:** Search and filter 12 sample query patterns, sort by name or risk, copy SQL, edit snippets, and save your own.
- **Oracle Error Guide:** Search common Oracle error codes, descriptions, and safe first checks.
- **Safe Run Checklist:** Track eight pre-execution and post-execution checks; completion persists in your browser.
- **Troubleshooting Notes:** Create, edit, review, copy, and delete incident notes.
- **Local persistence:** Your snippets, notes, and checklist progress are stored in this browser using `localStorage`.
- **Backup / restore:** Click the arrow icon beside the workspace profile to export a JSON backup. Right-click that icon to import a previously exported QueryVault JSON backup.
- **Responsive UI:** Desktop sidebar, tablet layout, and mobile navigation.

## Files

- `index.html` — page structure
- `styles.css` — responsive dark navy / purple / cyan design
- `app.js` — sample data, rendering, filtering, local persistence, and interactions
- `README.md` — setup and usage notes

## Important safety notes

- All SQL is illustrative sample content. Table and column names may not match your environment.
- Some examples use fictional table names such as `batch_run_audit` and `application_error_log`. Replace them with approved, verified objects.
- A query marked read-only can still expose sensitive information or create load. Follow your organization's access and data-handling policies.
- Do not execute write operations in production without the required approval, verified scope, backup/recovery plan, and post-change validation.
- Never save credentials, secrets, personal data, or confidential customer information in snippets or notes.
- Data is stored only in this browser profile on this device. Clearing browser site data can remove it. Export backups regularly.
- This starter does not connect to Oracle or execute SQL. It is a knowledge and workflow toolkit, not a database client.

## Suggested portfolio improvements

1. Add screenshots and a short demo GIF to your GitHub README.
2. Add tests for search, filters, local persistence, and export/import.
3. Add an authenticated backend and database only if you later need cross-device syncing.
4. Keep the SQL examples generic and never publish production data or credentials.

## License

Use and customize this starter for your portfolio or personal learning. Review any external fonts or assets before redistributing in a commercial project.
