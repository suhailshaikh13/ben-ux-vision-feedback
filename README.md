# Ben UX Vision Feedback

Simple static feedback page for Ben’s Pune UX Design Vision session.

- Plain **HTML / CSS / JS** (no build step)
- Hosts on **GitHub Pages**
- Saves responses to a **Google Sheet** via Apps Script
- Anyone can submit — **no login**, no laptop server

Responses appear **under the form** for everyone, and in your Sheet.

## Quick start (local)

1. Follow [apps-script/README.md](apps-script/README.md) to create the Sheet + web app.
2. Paste the `/exec` URL into [`config.js`](config.js).
3. Open `index.html` in a browser (or any static server).

## GitHub Pages

1. Push this folder to a GitHub repo (e.g. `ben-ux-vision-feedback`).
2. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` / root (`/`)
3. Share:

```text
https://<your-username>.github.io/ben-ux-vision-feedback/
```

If the repo name differs, the URL path matches the repo name.

Make sure `config.js` with your `SCRIPT_URL` is committed before (or right after) enabling Pages.

## What’s on the page

| Section | Contents |
| --- | --- |
| Form | Rating 1–5, note, Ask Ben, optional name/team |
| What people said | Live list from the Sheet (newest first) |

## Files

```text
index.html          page shell
styles.css          layout + Zendesk-ish tokens
app.js              form + list logic
config.js           SCRIPT_URL only
apps-script/        Code.gs + deploy steps
```

## Notes

- The Apps Script web app is open to **Anyone** (needed for public submit). Fine for an internal event; clean spam in the Sheet if needed.
- No delete UI — remove rows in Google Sheets.
- Changing the script requires a **new deployment version**.
