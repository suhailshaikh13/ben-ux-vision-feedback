# Apps Script + Google Sheet setup

One-time setup. After this, the static site on GitHub Pages talks to your Sheet with no laptop server and no attendee login.

## 1. Create the Sheet

1. Open [Google Sheets](https://sheets.google.com) → Blank spreadsheet.
2. Name it something like `Ben UX Vision Feedback`.
3. Rename the first tab to **`responses`**.
4. In row 1, add headers (A–H):

```text
id	createdAt	sessionId	q1	q2	askBen	name	team
```

5. Add a second tab named **`events`**.
6. In that tab, row 1 headers (A–F):

```text
id	createdAt	sessionId	event	step	meta
```

7. Copy the **Sheet ID** from the URL:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```

If you already had the old rating/reflection columns: redeploying the updated `Code.gs` **auto-clears** mismatched headers/rows on the next request and writes the launch schema. No need to hand-edit the Sheet first.

## 2. Add the script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete any stub code.
3. Paste [`Code.gs`](./Code.gs).
4. Set `SHEET_ID` near the top to your Sheet ID.
5. Save.

## 3. Deploy as a web app

1. **Deploy → New deployment**.
2. Type: **Web app**.
3. Description: `feedback v2 choose-based`.
4. **Execute as:** Me.
5. **Who has access:** Anyone.
6. Deploy → authorize Google permissions when prompted.
7. Copy the **Web app URL** (ends in `/exec`).

If you change `Code.gs` later: **Deploy → Manage deployments → Edit → New version**.

## 4. Point the SPA at it

In [`../config.js`](../config.js):

```js
window.FEEDBACK_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/XXXX/exec",
}
```

Open `index.html` locally or on GitHub Pages. Walk cover → rating → standout → optional share. A row should appear in **responses**, and funnel clicks in **events**.

## API (for debugging)

POST `Content-Type: text/plain` with JSON body:

```json
{ "action": "list" }
```

```json
{
  "action": "create",
  "sessionId": "s_test",
  "q1": "5",
  "q2": "project_loom",
  "askBen": "Loved the Loom framing — want a follow-up workshop.",
  "name": "Suhail",
  "team": "PLG Design"
}
```

```json
{
  "action": "event",
  "sessionId": "s_test",
  "event": "cover_cta",
  "step": "cover",
  "meta": ""
}
```

Valid `q1` ids: `1`–`5` (session rating)  
Valid `q2` ids: `design_vision`, `project_wrangler`, `project_loom`, `customers_changing`, `headless`  
`askBen`: optional open share text

`text/plain` avoids a browser CORS preflight; Apps Script still receives the JSON string.
