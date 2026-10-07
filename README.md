# Ben UX Vision Feedback

Single-page feedback form for Ben’s Pune UX Design Vision session.

- Plain **HTML / CSS / JS** (no build step)
- Hosts on **GitHub Pages**
- Saves to a **Google Sheet** via Apps Script

**Live:** https://suhailshaikh13.github.io/ben-ux-vision-feedback/

## Sheet (readable)

After redeploying [`apps-script/Code.gs`](apps-script/Code.gs), the `responses` tab looks like:

| Submitted at | How it landed | What stood out | Notes | Name | Team |
| --- | --- | --- | --- | --- | --- |
| 07 Oct 2026, 7:05 PM | 5  🤩 | Project Loom | … | Suhail | Design |

Until you redeploy, the live script still uses older column names, but new submits write **human labels** (e.g. `Project Loom` instead of `project_loom`).

**Redeploy:** Sheet → Extensions → Apps Script → paste `Code.gs` → Deploy → Manage deployments → Edit → **New version** → Deploy.

Details: [apps-script/README.md](apps-script/README.md).

## Local

1. Keep [`config.js`](config.js) pointed at the `/exec` URL.
2. Open `index.html` (or any static server).

## Files

```text
index.html       single-page form
styles.css       Zendesk Kale + Vanilla Sans
app.js           form, Sheet sync, aggregates
content.js       recap + questions + photos
config.js        SCRIPT_URL
apps-script/     Code.gs (readable Sheet schema)
photos/
```
