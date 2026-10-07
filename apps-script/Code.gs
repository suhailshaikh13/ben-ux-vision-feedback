/**
 * Ben UX Vision feedback — Google Sheets backend (choose-based flow)
 *
 * SETUP
 * 1. Create a Google Sheet.
 * 2. Rename the first tab to: responses
 * 3. Put this header row in A1:H1:
 *    id | createdAt | sessionId | q1 | q2 | askBen | name | team
 * 4. Add a second tab named: events
 * 5. Put this header row in events A1:F1:
 *    id | createdAt | sessionId | event | step | meta
 * 6. Extensions → Apps Script → paste this file.
 * 7. Set SHEET_ID below (from the Sheet URL: /d/SHEET_ID/edit).
 * 8. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 9. Copy the /exec URL into config.js → SCRIPT_URL
 *
 * API (POST body as text/plain JSON — avoids browser CORS preflight)
 *   { "action": "list" }
 *   { "action": "create", "sessionId": "", "q1": "", "q2": "", "askBen": "", "name": "", "team": "" }
 *   { "action": "event", "sessionId": "", "event": "", "step": "", "meta": "" }
 */

var SHEET_ID = "1fk4VyPl9LEbskOk2z-36S-IYym1A5TjdQJRKNYYDwtM"
var RESPONSES_TAB = "responses"
var EVENTS_TAB = "events"
var RESPONSE_HEADERS = [
  "id",
  "createdAt",
  "sessionId",
  "q1",
  "q2",
  "askBen",
  "name",
  "team",
]
var EVENT_HEADERS = ["id", "createdAt", "sessionId", "event", "step", "meta"]

var Q1_IDS = {
  "1": true,
  "2": true,
  "3": true,
  "4": true,
  "5": true,
}
var Q2_IDS = {
  design_vision: true,
  project_wrangler: true,
  project_loom: true,
  customers_changing: true,
  headless: true,
}

function doGet() {
  return json_({
    ok: true,
    hint: "POST JSON with action list, create, or event. See apps-script/README.md.",
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

    if (action === "event") {
      var ev = createEvent_(body)
      return json_({ ok: true, event: ev })
    }

    return json_({ error: "Unknown action. Use list, create, or event." }, 400)
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) }, 500)
  }
}

function listResponses_() {
  var sheet = getSheet_(RESPONSES_TAB, RESPONSE_HEADERS)
  var values = sheet.getDataRange().getValues()
  if (values.length < 2) return []

  var rows = []
  for (var i = 1; i < values.length; i++) {
    var row = values[i]
    if (!row[0] && !row[3]) continue
    rows.push({
      id: String(row[0] || ""),
      createdAt: String(row[1] || ""),
      sessionId: String(row[2] || ""),
      q1: String(row[3] || ""),
      q2: String(row[4] || ""),
      askBen: String(row[5] || ""),
      name: row[6] ? String(row[6]) : null,
      team: row[7] ? String(row[7]) : null,
    })
  }

  rows.sort(function (a, b) {
    return a.createdAt < b.createdAt ? 1 : -1
  })
  return rows
}

function createResponse_(body) {
  var q1 = String(body.q1 || "").trim()
  var q2 = String(body.q2 || "").trim()

  if (!Q1_IDS[q1]) {
    throw new Error("Pick a rating from 1 to 5.")
  }
  if (!Q2_IDS[q2]) {
    throw new Error("Pick what stood out most.")
  }

  var entry = {
    id: "fb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    sessionId: truncate_(String(body.sessionId || "").trim(), 80),
    q1: q1,
    q2: q2,
    askBen: truncate_(String(body.askBen || "").trim(), 2000),
    name: truncate_(String(body.name || "").trim(), 80) || null,
    team: truncate_(String(body.team || "").trim(), 80) || null,
  }

  var sheet = getSheet_(RESPONSES_TAB, RESPONSE_HEADERS)
  sheet.appendRow([
    entry.id,
    entry.createdAt,
    entry.sessionId || "",
    entry.q1,
    entry.q2,
    entry.askBen || "",
    entry.name || "",
    entry.team || "",
  ])

  return entry
}

function createEvent_(body) {
  var eventName = truncate_(String(body.event || "").trim(), 80)
  if (!eventName) {
    throw new Error("event is required.")
  }

  var entry = {
    id: "ev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    sessionId: truncate_(String(body.sessionId || "").trim(), 80),
    event: eventName,
    step: truncate_(String(body.step || "").trim(), 40),
    meta: truncate_(String(body.meta || "").trim(), 200),
  }

  var sheet = getSheet_(EVENTS_TAB, EVENT_HEADERS)
  sheet.appendRow([
    entry.id,
    entry.createdAt,
    entry.sessionId || "",
    entry.event,
    entry.step || "",
    entry.meta || "",
  ])

  return entry
}

function getSheet_(tabName, headers) {
  if (!SHEET_ID || SHEET_ID.indexOf("PASTE_") === 0) {
    throw new Error("Set SHEET_ID in Code.gs to your Google Sheet ID.")
  }
  var ss = SpreadsheetApp.openById(SHEET_ID)
  var sheet = ss.getSheetByName(tabName)
  if (!sheet) {
    sheet = ss.insertSheet(tabName)
  }
  ensureHeader_(sheet, headers)
  return sheet
}

function ensureHeader_(sheet, headers) {
  var lastCol = Math.max(sheet.getLastColumn(), headers.length)
  var first = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
  var existing = []
  for (var i = 0; i < first.length; i++) {
    if (String(first[i] || "").trim()) existing.push(String(first[i]).trim())
  }
  var expected = headers.join("|")
  var current = existing.join("|")

  // Empty sheet, or old schema (e.g. rating/reflection) — wipe and write launch headers.
  if (!current || current !== expected) {
    sheet.clear()
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
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
