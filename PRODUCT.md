# Product

## Platform

web (static)

## Stack

Plain HTML/CSS/JS on GitHub Pages. Persistence via Google Sheets through a public Apps Script web app (`responses` + `events` tabs).

## Users

- **Respondents:** Pune teammates after Ben’s UX Design Vision session — refresh memory on a cover, answer two forced-choice questions, optionally Ask Ben. No sign-in.
- **Host (Suhail):** Shares the Pages link; reviews aggregates / Ask Ben questions on the done step and in the Sheet; funnel clicks in the `events` tab.

## Product Purpose

Zero-friction post-event feedback. Success = open one internal link, two taps (+ optional question), under about a minute.

## Constraints

- GitHub Pages is static-only; Sheet + Apps Script is the write path.
- Web app access is “Anyone” — open write for the event window; fine for internal share.
- Identity is optional name/team only; session id in `localStorage` stitches clicks without auth.
