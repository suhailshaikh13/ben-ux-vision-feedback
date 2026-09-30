# Apps Script + Google Sheet setup

One-time setup. After this, the static site on GitHub Pages talks to your Sheet with no laptop server and no attendee login.

## 1. Create the Sheet

1. Open [Google Sheets](https://sheets.google.com) → Blank spreadsheet.
2. Name it something like `Ben UX Vision Feedback`.
3. Rename the first tab to **`responses`**.
4. In row 1, add headers (A–G):

```text
id	createdAt	rating	reflection	question	name	team
```

5. Copy the **Sheet ID** from the URL:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```

## 2. Add the script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete any stub code.
3. Paste [`Code.gs`](./Code.gs).
4. Set `SHEET_ID` near the top to your Sheet ID.
5. Save.

## 3. Deploy as a web app

1. **Deploy → New deployment**.
2. Type: **Web app**.
3. Description: `feedback v1`.
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

Open `index.html` locally or on GitHub Pages and submit a test response. It should appear under **What people said** and as a new Sheet row.

## API (for debugging)

POST `Content-Type: text/plain` with JSON body:

```json
{ "action": "list" }
```

```json
{
  "action": "create",
  "rating": 5,
  "reflection": "Clear and useful.",
  "question": "How do we measure craft?",
  "name": "Suhail",
  "team": "PLG Design"
}
```

`text/plain` avoids a browser CORS preflight; Apps Script still receives the JSON string.
