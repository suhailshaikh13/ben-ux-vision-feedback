;(() => {
  const RATING_LABELS = {
    1: "Missed me",
    2: "A little thin",
    3: "Solid",
    4: "Landed well",
    5: "Changed how I think",
  }

  const form = document.getElementById("feedback-form")
  const submitBtn = document.getElementById("submit-btn")
  const formError = document.getElementById("form-error")
  const formOk = document.getElementById("form-ok")
  const listEl = document.getElementById("responses-list")
  const statusEl = document.getElementById("responses-status")
  const refreshBtn = document.getElementById("refresh-btn")

  const scriptUrl = (window.FEEDBACK_CONFIG && window.FEEDBACK_CONFIG.SCRIPT_URL || "").trim()

  function showError(message) {
    formOk.hidden = true
    formError.hidden = !message
    formError.textContent = message || ""
  }

  function showOk() {
    formError.hidden = true
    formOk.hidden = false
  }

  function formatWhen(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso))
    } catch {
      return iso || ""
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function renderResponses(responses) {
    listEl.innerHTML = ""

    if (!responses.length) {
      statusEl.textContent = "No responses yet. Be the first."
      return
    }

    statusEl.textContent = `${responses.length} response${responses.length === 1 ? "" : "s"}`
    const frag = document.createDocumentFragment()

    for (const item of responses) {
      const li = document.createElement("li")
      li.className = "response-card"

      const who = [item.name, item.team].filter(Boolean).join(" · ") || "Anonymous"
      const rating = Number(item.rating)
      const label = RATING_LABELS[rating] || ""
      const reflection = (item.reflection || "").trim()
      const question = (item.question || "").trim()

      li.innerHTML = `
        <div class="response-meta">
          <div class="response-who">${escapeHtml(who)}</div>
          <div class="response-when">${escapeHtml(formatWhen(item.createdAt))}</div>
        </div>
        <div class="response-rating">${escapeHtml(`${rating}/5 · ${label}`)}</div>
        ${reflection ? `<p class="response-body">${escapeHtml(reflection)}</p>` : ""}
        ${question ? `<p class="response-ask">${escapeHtml(question)}</p>` : ""}
      `
      frag.appendChild(li)
    }

    listEl.appendChild(frag)
  }

  async function apiRequest(payload) {
    if (!scriptUrl) {
      throw new Error(
        "Add your Apps Script URL to config.js (SCRIPT_URL), then refresh this page.",
      )
    }

    // text/plain avoids a CORS preflight; Apps Script reads e.postData.contents
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error("Unexpected response from the Sheet backend.")
    }

    if (!res.ok || data.error) {
      throw new Error(data.error || "Request failed.")
    }
    return data
  }

  async function loadResponses() {
    statusEl.textContent = "Loading responses…"
    try {
      const data = await apiRequest({ action: "list" })
      renderResponses(Array.isArray(data.responses) ? data.responses : [])
    } catch (err) {
      statusEl.textContent =
        err instanceof Error ? err.message : "Could not load responses."
      listEl.innerHTML = ""
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    showError("")
    formOk.hidden = true

    const fd = new FormData(form)
    if ((fd.get("website") || "").toString().trim()) {
      // Honeypot filled — pretend success
      showOk()
      form.reset()
      return
    }

    const rating = Number(fd.get("rating"))
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      showError("Pick a rating from 1 to 5.")
      return
    }

    const payload = {
      action: "create",
      rating,
      reflection: (fd.get("reflection") || "").toString().trim(),
      question: (fd.get("question") || "").toString().trim(),
      name: (fd.get("name") || "").toString().trim(),
      team: (fd.get("team") || "").toString().trim(),
    }

    submitBtn.disabled = true
    submitBtn.textContent = "Sending…"

    try {
      const data = await apiRequest(payload)
      showOk()
      form.reset()
      if (data.entry) {
        const existing = [...listEl.querySelectorAll(".response-card")].length
        // Reload for a consistent newest-first list from the Sheet
        await loadResponses()
        void existing
      } else {
        await loadResponses()
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send feedback.")
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = "Send feedback"
    }
  })

  refreshBtn.addEventListener("click", () => {
    void loadResponses()
  })

  void loadResponses()
})()
