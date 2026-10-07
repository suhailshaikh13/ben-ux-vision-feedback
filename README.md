# Ben UX Vision Feedback

Choose-based feedback page for Ben’s Pune UX Design Vision session.

- Plain **HTML / CSS / JS** (no build step)
- Hosts on **GitHub Pages**
- Saves responses + click events to a **Google Sheet** via Apps Script

**Live:** https://suhailshaikh13.github.io/ben-ux-vision-feedback/

Flow: **cover** → **rating** → **what stood out** → **optional share** → aggregates.

## Before you share with the team

The static site is on GitHub Pages. The Sheet backend must be on the **choose-based** script (q1 / q2 / askBen), not the old rating form.

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Replace the script with [`apps-script/Code.gs`](apps-script/Code.gs) (keep the same `SHEET_ID`).
3. **Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy.**
4. First request after deploy **clears the old test schema/rows** and writes the new headers (`q1`, `q2`, `askBen`, …) plus creates an `events` tab if missing.
5. Smoke-test once: submit the form, confirm a new row in **responses**.
6. Share the Pages link.

Full setup notes: [apps-script/README.md](apps-script/README.md).

## Quick start (local)

1. Deploy Apps Script (above) and keep [`config.js`](config.js) pointed at the `/exec` URL.
2. Open `index.html` (or any static server).

## What’s on the page

| Step | Contents |
| --- | --- |
| Cover | Photo slideshow + talk recap + Start |
| Q1 | Emoji rating 1–5 (tap advances) |
| Q2 | Single-select standout (tap advances) |
| Q3 | Optional open note + name/team; Skip or Submit |
| Done | Aggregate bars + shared notes |

Copy and images live in [`content.js`](content.js).

## Files

```text
index.html              multi-step shell
styles.css              Zendesk Kale + Vanilla Sans
app.js                  steps, session, events, submit, aggregates
content.js              recap, questions, cover photos
config.js               SCRIPT_URL only
photos/                 session photos
apps-script/            Code.gs + deploy steps
```

## Notes

- Web app access is **Anyone** (needed for public submit). Internal event use.
- Funnel events: `cover_view`, `cover_cta`, `q1_select`, `q2_select`, `ask_skip`, `submit`.
- After submit, refresh returns to results (no double form).
- Changing the script requires a **new deployment version**.
