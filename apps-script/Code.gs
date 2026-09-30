/**
 * Ben UX Vision feedback — Google Sheets backend
 *
 * SETUP
 * 1. Create a Google Sheet.
 * 2. Rename the first tab to: responses
 * 3. Put this header row in A1:G1:
 *    id | createdAt | rating | reflection | question | name | team
 * 4. Extensions → Apps Script → paste this file.
 * 5. Set SHEET_ID below (from the Sheet URL: /d/SHEET_ID/edit).
 * 6. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the /exec URL into config.js → SCRIPT_URL
 *
 * API (POST body as text/plain JSON — avoids browser CORS preflight)
 *   { "action": "list" }
 *   { "action": "create", "rating": 1-5, "reflection": "", "question": "", "name": "", "team": "" }
 */

var SHEET_ID = "1fk4VyPl9LEbskOk2z-36S-IYym1A5TjdQJRKNYYDwtM"
var TAB_NAME = "responses"
var HEADERS = ["id", "createdAt", "rating", "reflection", "question", "name", "team"]

function doGet() {
  return json_({
    ok: true,
    hint: "POST JSON with action list or create. See apps-script/README.md.",
  })
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || "{}"
    var body = JSON.parse(raw)
    var action = String(body.action || "").toLowerCase()

    if (action === "list") {
      return json_({ ok: true, responses: listResponses_() })
    }

    if (action === "create") {
      var entry = createResponse_(body)
      return json_({ ok: true, entry: entry })
    }

    return json_({ error: "Unknown action. Use list or create." }, 400)
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) }, 500)
  }
}

function listResponses_() {
  var sheet = getSheet_()
  ensureHeader_(sheet)
  var values = sheet.getDataRange().getValues()
  if (values.length < 2) return []

  var rows = []
  for (var i = 1; i < values.length; i++) {
    var row = values[i]
    if (!row[0] && !row[2]) continue
    rows.push({
      id: String(row[0] || ""),
      createdAt: String(row[1] || ""),
      rating: Number(row[2]),
      reflection: String(row[3] || ""),
      question: String(row[4] || ""),
      name: row[5] ? String(row[5]) : null,
      team: row[6] ? String(row[6]) : null,
    })
  }

  rows.sort(function (a, b) {
    return a.createdAt < b.createdAt ? 1 : -1
  })
  return rows
}

function createResponse_(body) {
  var rating = Number(body.rating)
  if (!isFinite(rating) || rating % 1 !== 0 || rating < 1 || rating > 5) {
    throw new Error("Pick a rating from 1 to 5.")
  }

  var entry = {
    id: "fb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    rating: rating,
    reflection: truncate_(String(body.reflection || "").trim(), 2000),
    question: truncate_(String(body.question || "").trim(), 1000),
    name: truncate_(String(body.name || "").trim(), 80) || null,
    team: truncate_(String(body.team || "").trim(), 80) || null,
  }

  var sheet = getSheet_()
  ensureHeader_(sheet)
  sheet.appendRow([
    entry.id,
    entry.createdAt,
    entry.rating,
    entry.reflection,
    entry.question,
    entry.name || "",
    entry.team || "",
  ])

  return entry
}

function getSheet_() {
  if (!SHEET_ID || SHEET_ID.indexOf("PASTE_") === 0) {
    throw new Error("Set SHEET_ID in Code.gs to your Google Sheet ID.")
  }
  var ss = SpreadsheetApp.openById(SHEET_ID)
  var sheet = ss.getSheetByName(TAB_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME)
  }
  return sheet
}

function ensureHeader_(sheet) {
  var first = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0]
  var empty = !first.join("")
  if (empty) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
  }
}

function truncate_(value, max) {
  return value.length > max ? value.slice(0, max) : value
}

function json_(obj, status) {
  // Apps Script ContentService does not set HTTP status reliably for web apps;
  // include error fields in the body instead. `status` kept for readability.
  void status
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
