# Display-finass-data-export
## Disclaimer

This is an unofficial personal tool for reading data exported from FINASS (Finanzberatersoftware GmbH, https://finanzberatersoftware.de/). It is not affiliated with, endorsed by, or associated with FINASS or Finanzberatersoftware GmbH. No FINASS software or proprietary data is distributed with this repository.

This project is licensed under the [MIT License](LICENSE).

## Overall goal

The FINASS software is terminating its old product, where users could save their customers, contracts and documents / messages relevant for these contracts. This tool reads the exported `.mdb` database and provides a modern read-only UI to explore that data locally.

## Initial Set Up (only done once)
### Configure Finass Data
The file `config.json` in the repository root controls where the app looks for data:

```json
{
  "finassDBPath": "finass-data/FINASS_DATA_EXPORT.mdb",
  "finassDocumentsPath": "C:/Users/you/Documents/documents"
}
```

| Property | Description |
|---|---|
| `finassDBPath` | Path to the `.mdb` database export |
| `finassDocumentsPath` | Path to the `documents` folder containing the document subfolders (`00001/`, `00002/`, …) |

Both paths can be **relative** (resolved from the repository root) or **absolute** (e.g. `C:/Users/you/Documents/FINASS_DATA_EXPORT.mdb`).
⚠️ Paths must use `/` and not `\` as this will be considered as an escape character.

#### Locating the documents folder
The `documents` folder structure looks like this:
```
documents/
  ├── 00001/
  │   ├── 24534215286486.EML
  │   ├── 24534215037154.pdf
  │   └── ...
  ├── 00002/
  │   └── ...
  └── ...
```
#### Creating the mdb data export
The `.mdb` data export must be created manually from FINASS:
Programm --> Einstellungen --> Admin Einstellungen --> Vollständiger Datenexport

### Install dependencies
1. Install [Node.js](https://nodejs.org/en/download)
2. Run `npm i` within this folder (a new folder `node_modules` should be present now)

## How to run locally

### One-click start (recommended)

Double-click **`start.bat`** in the repository root.

This opens the backend and frontend each in their own console window, waits until the app is ready, and then automatically opens **http://localhost:5173** in your default browser.

> 💡 This works even if you get the *"Running Scripts is Disabled on this System"* error in PowerShell — `.bat` files always run via `cmd.exe` and are unaffected by that policy.

### Manual start (terminal)

The app consists of a Node.js backend (Express) and a React frontend (Vite). Both must be running at the same time.

```bash
npm start
```

This starts both processes together using `concurrently`. Output is color-coded (blue = backend, green = frontend).

Then open **http://localhost:5173** in your browser.

You can also start them individually in separate terminals:

```bash
npm run start:backend   # API server on http://localhost:3001
npm run start:app       # React dev server on http://localhost:5173
```

## Architecture

The app is split into two processes that must both be running:

- **Backend** (`/backend`) — Node.js + Express on port 3001. Reads the entire MDB file into memory on startup using `mdb-reader` (pure JS, no Access engine required). All filtering and joining is done in JavaScript.
- **Frontend** (`/app`) — React + Vite on port 5173. Communicates with the backend via `/api` (proxied by Vite in dev). No CSS framework — plain CSS with a dark theme.

### API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/customers` | List customers — `?search=` filters by name, city, or zip |
| GET | `/api/customers/:id` | Single customer with persons and contact info |
| GET | `/api/customers/:id/contracts` | Contracts for a customer, active first |
| GET | `/api/customers/:id/contacts` | Correspondence history, sorted newest first |
| GET | `/api/customers/:id/documents` | Customer-level documents |
| GET | `/api/contracts/:id` | Single contract detail |
| GET | `/api/contracts/:id/documents` | Documents linked to a contract |
| GET | `/api/documents/:docId/file` | Serve the raw document file from disk |
| GET | `/api/documents/:docId/parsed` | Parse an EML email and return structured JSON |

### Views

#### Kunden (Customer list)

The default landing page at `/`. Shows all 754 customers in a sortable table with name, city, zip code, status badge, and contract count.

A search box at the top filters the list in real time (250 ms debounce) by customer name, city, or zip code. Clicking any row navigates to the customer detail view.

#### Kundendetail (Customer detail)

Route: `/customers/:id`

Header card shows the customer's name, address, and status. The main area is split into tabs:

- **Personen** — people linked to this customer (name, date of birth, occupation, employer, marital status, net income)
- **Verträge** — all contracts for this customer (contract number, insurer, status badge, premium, start and end date). Clicking a row opens the contract detail view.
- **Korrespondenz** — chronological correspondence history sorted newest first (date, subject, type badge with direction arrow). For emails: sender, recipient, CC, attachment count. For calls: duration. Filterable by free text and by correspondence type.
- **Dokumente** — documents linked directly to this customer (Maklervertrag, Maklervollmacht, etc.). Filterable, sortable table with file preview on click.
- **Kommunikation** — contact details such as phone numbers and email addresses (only shown if data exists)

#### Vertragsdetail (Contract detail)

Route: `/contracts/:id`

Header card shows the contract number, insurer, status badge, and key financials (premium, contract sum, start/end date). Below the header the detail card (applicant, tariff premium, notes) is always visible. A single **Dokumente** tab lists all documents linked to this contract (filterable, sortable, with file preview on click).
