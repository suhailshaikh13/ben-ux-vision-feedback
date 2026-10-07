/**
 * Ben UX Vision feedback — Google Sheets backend
 *
 * Readable columns in the responses tab:
 *   Submitted at | How it landed | What stood out | Notes | Name | Team
 *
 * SETUP
 * 1. Create / open the Google Sheet.
 * 2. Extensions → Apps Script → paste this file.
 * 3. Set SHEET_ID below.
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the /exec URL into config.js → SCRIPT_URL
 *
 * If you already deployed an older version: Deploy → Manage deployments → Edit → New version.
 *
 * API (POST text/plain JSON)
 *   { "action": "list" }
 *   { "action": "create", "q1": "1"-"5", "q2": "<id>", "askBen": "", "name": "", "team": "" }
 *   { "action": "event", "sessionId": "", "event": "", "step": "", "meta": "" }
 */

var SHEET_ID = "1fk4VyPl9LEbskOk2z-36S-IYym1A5TjdQJRKNYYDwtM"
var RESPONSES_TAB = "responses"
var EVENTS_TAB = "events"

// Human-readable headers for anyone opening the Sheet
var RESPONSE_HEADERS = [
  "Submitted at",
  "How it landed",
  "What stood out",
  "Notes",
  "Name",
  "Team",
]
var EVENT_HEADERS = ["Time", "Session", "Event", "Step", "Detail"]

var Q1_EMOJI = {
  "1": "😕",
  "2": "😐",
  "3": "🙂",
  "4": "😊",
  "5": "🤩",
}

var Q2_LABELS = {
  design_vision: "Design vision for Zendesk",
  project_wrangler: "Project Wrangler",
  project_loom: "Project Loom",
  customers_changing: "How customers are changing — and how we adapt",
  headless: "Headless products (design beyond the UI)",
}

var Q1_IDS = { "1": true, "2": true, "3": true, "4": true, "5": true }
var Q2_IDS = {
  design_vision: true,
  project_wrangler: true,
  project_loom: true,
  customers_changing: true,
  headless: true,
}

/**
 * RUN THIS FROM THE APPS SCRIPT EDITOR to wipe test rows:
 * 1. Select resetForTesting in the function dropdown (top bar)
 * 2. Click Run ▶
 * 3. Approve permissions if asked
 * Keeps header row; clears responses + events data.
 */
function resetForTesting() {
  clearTabKeepHeader_(RESPONSES_TAB, RESPONSE_HEADERS)
  clearTabKeepHeader_(EVENTS_TAB, EVENT_HEADERS)
}

function clearTabKeepHeader_(tabName, headers) {
  var ss = SpreadsheetApp.openById(SHEET_ID)
  var sheet = ss.getSheetByName(tabName)
  if (!sheet) {
    sheet = ss.insertSheet(tabName)
  }
  sheet.clear()
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  sheet.setFrozenRows(1)
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold")
}

function doGet() {
  return json_({
    ok: true,
    hint: "POST JSON with action list, create, event, or reset.",
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
      return json_({ ok: true, entry: createResponse_(body) })
    }
    if (action === "event") {
      return json_({ ok: true, event: createEvent_(body) })
    }
    if (action === "reset") {
      // Optional web reset after redeploy — same as resetForTesting()
      resetForTesting()
      return json_({ ok: true, cleared: true })
    }
    return json_({ error: "Unknown action. Use list, create, event, or reset." })
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) })
  }
}

function formatWhen_(iso) {
  try {
    var d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return Utilities.formatDate(d, Session.getScriptTimeZone() || "Asia/Kolkata", "dd MMM yyyy, h:mm a")
  } catch (e) {
    return iso
  }
}

function formatLanding_(q1) {
  var emoji = Q1_EMOJI[q1] || ""
  return emoji ? q1 + "  " + emoji : String(q1)
}

function labelForQ2_(q2, fallbackLabel) {
  if (fallbackLabel) return String(fallbackLabel)
  return Q2_LABELS[q2] || q2
}

function q2IdFromLabel_(label) {
  var text = String(label || "").trim()
  if (Q2_IDS[text]) return text
  for (var id in Q2_LABELS) {
    if (Q2_LABELS[id] === text) return id
  }
  return text
}

function q1FromLanding_(text) {
  var m = String(text || "").match(/[1-5]/)
  return m ? m[0] : String(text || "").trim()
}

function listResponses_() {
  var sheet = getSheet_(RESPONSES_TAB, RESPONSE_HEADERS)
  var values = sheet.getDataRange().getValues()
  if (values.length < 2) return []

  var headers = values[0].map(function (h) {
    return String(h || "").trim()
  })
  var rows = []

  for (var i = 1; i < values.length; i++) {
    var row = values[i]
    if (!row.join("")) continue

    var obj = rowToObject_(headers, row)
    var normalized = normalizeRow_(obj)
    if (normalized) rows.push(normalized)
  }

  rows.sort(function (a, b) {
    return a.createdAt < b.createdAt ? 1 : -1
  })
  return rows
}

function rowToObject_(headers, row) {
  var obj = {}
  for (var c = 0; c < headers.length; c++) {
    obj[headers[c]] = row[c]
  }
  // Also expose positional fallbacks for older tabs
  obj._0 = row[0]
  obj._1 = row[1]
  obj._2 = row[2]
  obj._3 = row[3]
  obj._4 = row[4]
  obj._5 = row[5]
  obj._6 = row[6]
  return obj
}

function normalizeRow_(obj) {
  // New readable schema
  if (obj["How it landed"] != null || obj["What stood out"] != null) {
    var q1 = q1FromLanding_(obj["How it landed"])
    var q2 = q2IdFromLabel_(obj["What stood out"])
    if (!q1) return null
    return {
      id: String(obj.id || obj._6 || ""),
      createdAt: String(obj.createdAt || obj["Submitted at"] || ""),
      sessionId: "",
      q1: q1,
      q2: q2,
      askBen: String(obj["Notes"] || ""),
      name: obj["Name"] ? String(obj["Name"]) : null,
      team: obj["Team"] ? String(obj["Team"]) : null,
      howItLanded: String(obj["How it landed"] || ""),
      whatStoodOut: String(obj["What stood out"] || ""),
    }
  }

  // Legacy choose-based: id | createdAt | sessionId | q1 | q2 | askBen | name | team
  if (obj.q1 || (obj._3 && Q1_IDS[String(obj._3)])) {
    return {
      id: String(obj.id || obj._0 || ""),
      createdAt: String(obj.createdAt || obj._1 || ""),
      sessionId: String(obj.sessionId || obj._2 || ""),
      q1: String(obj.q1 || obj._3 || ""),
      q2: String(obj.q2 || obj._4 || ""),
      askBen: String(obj.askBen || obj._5 || ""),
      name: obj.name || obj._6 ? String(obj.name || obj._6) : null,
      team: obj.team || obj._7 ? String(obj.team || obj._7) : null,
    }
  }

  // Oldest: id | createdAt | rating | reflection | question | name | team
  if (obj.rating != null || obj._2 != null) {
    var rating = obj.rating != null ? obj.rating : obj._2
    if (rating === "" || rating == null) return null
    return {
      id: String(obj.id || obj._0 || ""),
      createdAt: String(obj.createdAt || obj._1 || ""),
      sessionId: "",
      q1: String(rating),
      q2: q2IdFromLabel_(obj.question != null ? obj.question : obj._4),
      askBen: String(obj.reflection != null ? obj.reflection : obj._3 || ""),
      name: obj.name || obj._5 ? String(obj.name || obj._5) : null,
      team: obj.team || obj._6 ? String(obj.team || obj._6) : null,
    }
  }

  return null
}

function createResponse_(body) {
  var q1 = String(
    body.q1 != null && String(body.q1) !== "" ? body.q1 : body.rating != null ? body.rating : "",
  ).trim()
  var q2 = String(
    body.q2 != null && String(body.q2) !== "" ? body.q2 : body.question != null ? body.question : "",
  ).trim()
  // If client sent a label in question, map to id when possible
  if (!Q2_IDS[q2]) q2 = q2IdFromLabel_(q2)

  var askBen = String(
    body.askBen != null && String(body.askBen) !== ""
      ? body.askBen
      : body.reflection != null
        ? body.reflection
        : body.notes != null
          ? body.notes
          : "",
  ).trim()

  if (!Q1_IDS[q1]) {
    throw new Error("Pick a rating from 1 to 5.")
  }
  if (!Q2_IDS[q2]) {
    throw new Error("Pick what stood out most.")
  }

  var createdAt = new Date().toISOString()
  var standout = labelForQ2_(q2, body.q2Label || body.whatStoodOut)
  var landing = body.q1Label || formatLanding_(q1)
  var name = truncate_(String(body.name || "").trim(), 80)
  var team = truncate_(String(body.team || "").trim(), 80)

  var entry = {
    id: "fb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    createdAt: createdAt,
    sessionId: truncate_(String(body.sessionId || "").trim(), 80),
    q1: q1,
    q2: q2,
    askBen: truncate_(askBen, 2000),
    name: name || null,
    team: team || null,
    howItLanded: landing,
    whatStoodOut: standout,
  }

  var sheet = getSheet_(RESPONSES_TAB, RESPONSE_HEADERS)
  sheet.appendRow([
    formatWhen_(createdAt),
    landing,
    standout,
    entry.askBen || "",
    name,
    team,
  ])

  // Keep the table easy to scan
  try {
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).setFontWeight("bold")
    sheet.autoResizeColumns(1, RESPONSE_HEADERS.length)
  } catch (e) {
    // non-fatal
  }

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
    formatWhen_(entry.createdAt),
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
  if (!sheet) sheet = ss.insertSheet(tabName)
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
  if (current === expected) return

  if (!current) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold")
    return
  }

  // Migrate prior schemas into readable columns (keep data).
  var values = sheet.getDataRange().getValues()
  var migrated = [headers]

  for (var r = 1; r < values.length; r++) {
    var row = values[r]
    if (!row.join("")) continue

    // Readable already but wrong order — skip handled by header mismatch path
    // Legacy choose-based: id, createdAt, sessionId, q1, q2, askBen, name, team
    if (existing[3] === "q1" || existing.indexOf("q1") !== -1) {
      var q1b = String(row[3] || "")
      var q2b = String(row[4] || "")
      migrated.push([
        formatWhen_(String(row[1] || "")),
        formatLanding_(q1b),
        labelForQ2_(q2b),
        String(row[5] || ""),
        String(row[6] || ""),
        String(row[7] || ""),
      ])
      continue
    }

    // Oldest: id, createdAt, rating, reflection, question, name, team
    if (existing[2] === "rating" || existing.indexOf("rating") !== -1) {
      var q1a = String(row[2] != null ? row[2] : "")
      var q2a = q2IdFromLabel_(row[4])
      migrated.push([
        formatWhen_(String(row[1] || "")),
        formatLanding_(q1a),
        labelForQ2_(q2a, row[4]),
        String(row[3] || ""),
        String(row[5] || ""),
        String(row[6] || ""),
      ])
      continue
    }

    // Unknown — best effort copy first cells
    migrated.push([
      String(row[0] || ""),
      String(row[1] || ""),
      String(row[2] || ""),
      String(row[3] || ""),
      String(row[4] || ""),
      String(row[5] || ""),
    ])
  }

  sheet.clear()
  sheet.getRange(1, 1, migrated.length, headers.length).setValues(migrated)
  sheet.setFrozenRows(1)
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold")
  try {
    sheet.autoResizeColumns(1, headers.length)
  } catch (e2) {}
}

function truncate_(value, max) {
  return value.length > max ? value.slice(0, max) : value
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
