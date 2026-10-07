# Apps Script + Google Sheet setup

One-time setup. After this, the static site on GitHub Pages talks to your Sheet with no laptop server and no attendee login.

## Readable Sheet columns

The `responses` tab uses:

| Submitted at | How it landed | What stood out | Notes | Name | Team |
| --- | --- | --- | --- | --- | --- |
| 07 Oct 2026, 7:05 PM | 5  🤩 | Project Loom | Optional note… | Suhail | Design |

## 1. Open the Sheet + script

1. Open [the feedback Sheet](https://docs.google.com/spreadsheets/d/1fk4VyPl9LEbskOk2z-36S-IYym1A5TjdQJRKNYYDwtM/edit) (or create a new one).
2. **Extensions → Apps Script**.
3. Replace all code with [`Code.gs`](./Code.gs).
4. Confirm `SHEET_ID` matches your Sheet URL.
5. Save.

## 2. Deploy (or redeploy) as a web app

**First time**

1. **Deploy → New deployment** → type **Web app**.
2. Execute as: **Me** · Who has access: **Anyone**.
3. Deploy → authorize → copy the `/exec` URL into [`../config.js`](../config.js).

**Already deployed (required for readable columns)**

1. **Deploy → Manage deployments → ✎ Edit**.
2. Version: **New version**.
3. Deploy.

The first request after redeploy **migrates** old rows into the readable headers (keeps data).

## 3. Smoke test

1. Open the live form and submit once.
2. Confirm a new readable row in **responses**.

## API

POST `Content-Type: text/plain` JSON:

```json
{ "action": "list" }
```

```json
{
  "action": "create",
  "q1": "5",
  "q2": "project_loom",
  "askBen": "Loved the Loom framing.",
  "name": "Suhail",
  "team": "PLG Design",
  "q1Label": "5  🤩",
  "q2Label": "Project Loom"
}
```

Valid `q1`: `1`–`5` · Valid `q2`: `design_vision`, `project_wrangler`, `project_loom`, `customers_changing`, `headless`
