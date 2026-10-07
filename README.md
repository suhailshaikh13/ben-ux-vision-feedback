# Ben UX Vision Feedback

Choose-based feedback page for Ben’s Pune UX Design Vision session.

- Plain **HTML / CSS / JS** (no build step)
- Hosts on **GitHub Pages**
- Saves responses + click events to a **Google Sheet** via Apps Script

**Live:** https://suhailshaikh13.github.io/ben-ux-vision-feedback/

Flow: **cover** → **rating** → **what stood out** → **optional share** → aggregates.

## Sheet reliability

The site sends a **dual payload** (new `q1/q2/askBen` + legacy `rating/reflection/question`) so writes succeed even if the Apps Script deployment is still on the older schema. Submits **retry** and only complete after the Sheet confirms. Locally parked answers are flushed on load.

Optional but recommended — redeploy [`apps-script/Code.gs`](apps-script/Code.gs) once (Manage deployments → New version) so the Sheet uses the choose-based columns natively. See [apps-script/README.md](apps-script/README.md).

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
