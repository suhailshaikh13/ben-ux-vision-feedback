;(() => {
  const content = window.FEEDBACK_CONTENT || {}
  const scriptUrl = ((window.FEEDBACK_CONFIG && window.FEEDBACK_CONFIG.SCRIPT_URL) || "").trim()
  const SESSION_KEY = "ben-ux-vision-session"
  const LOCAL_RESPONSES_KEY = "ben-ux-vision-responses"
  const SUBMITTED_KEY = "ben-ux-vision-submitted"
  const EPOCH_KEY = "ben-ux-vision-epoch"
  const DATA_EPOCH = "single-page-2026-10-07"
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const gsap = window.gsap

  function resetLocalDataIfNeeded() {
    try {
      if (localStorage.getItem(EPOCH_KEY) === DATA_EPOCH) return
      localStorage.removeItem(LOCAL_RESPONSES_KEY)
      localStorage.removeItem(SUBMITTED_KEY)
      localStorage.setItem(EPOCH_KEY, DATA_EPOCH)
    } catch {
      /* private mode */
    }
  }

  resetLocalDataIfNeeded()

  const state = {
    sessionId: getOrCreateSessionId(),
    q1: null,
    q2: null,
    slideshowTween: null,
    submitted: hasSubmitted(),
  }

  function getOrCreateSessionId() {
    try {
      let id = localStorage.getItem(SESSION_KEY)
      if (!id) {
        id = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10)
        localStorage.setItem(SESSION_KEY, id)
      }
      return id
    } catch {
      return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10)
    }
  }

  function hasSubmitted() {
    try {
      return localStorage.getItem(SUBMITTED_KEY) === "1"
    } catch {
      return false
    }
  }

  function markSubmitted() {
    state.submitted = true
    try {
      localStorage.setItem(SUBMITTED_KEY, "1")
    } catch {
      /* ignore */
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function readLocalResponses() {
    try {
      const raw = localStorage.getItem(LOCAL_RESPONSES_KEY)
      const list = raw ? JSON.parse(raw) : []
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }

  function writeLocalResponses(list) {
    try {
      localStorage.setItem(LOCAL_RESPONSES_KEY, JSON.stringify(list))
    } catch {
      /* ignore */
    }
  }

  function saveLocalResponse(entry) {
    const list = readLocalResponses().filter((row) => row && row.id !== entry.id)
    list.unshift(entry)
    writeLocalResponses(list)
    return entry
  }

  function removeLocalResponse(id) {
    writeLocalResponses(readLocalResponses().filter((row) => row && row.id !== id))
  }

  function choiceById(questionKey, id) {
    const q = content[questionKey]
    return (q && q.choices ? q.choices : []).find((c) => c.id === id) || null
  }

  function q1SheetLabel(id) {
    const c = choiceById("q1", id)
    if (!c) return String(id)
    return c.emoji ? `${id}  ${c.emoji}` : String(id)
  }

  function q2SheetLabel(id) {
    const c = choiceById("q2", id)
    return (c && c.label) || String(id)
  }

  function resolveQ2Id(value) {
    const text = String(value || "").trim()
    if (!text) return ""
    const byId = choiceById("q2", text)
    if (byId) return byId.id
    const byLabel = (content.q2.choices || []).find((c) => c.label === text)
    return byLabel ? byLabel.id : text
  }

  function normalizeResponse(row) {
    if (!row || typeof row !== "object") return null

    if (row.q1 && row.q2) {
      return {
        id: String(row.id || ""),
        createdAt: String(row.createdAt || ""),
        q1: String(row.q1),
        q2: String(row.q2),
        askBen: String(row.askBen || ""),
        name: row.name || null,
        team: row.team || null,
        howItLanded: row.howItLanded || q1SheetLabel(row.q1),
        whatStoodOut: row.whatStoodOut || q2SheetLabel(row.q2),
      }
    }

    if (row.howItLanded || row.whatStoodOut) {
      const q1Match = String(row.howItLanded || "").match(/[1-5]/)
      return {
        id: String(row.id || ""),
        createdAt: String(row.createdAt || ""),
        q1: q1Match ? q1Match[0] : "",
        q2: resolveQ2Id(row.whatStoodOut || row.q2),
        askBen: String(row.askBen || row.notes || ""),
        name: row.name || null,
        team: row.team || null,
        howItLanded: String(row.howItLanded || ""),
        whatStoodOut: String(row.whatStoodOut || ""),
      }
    }

    if (row.rating != null && String(row.rating) !== "") {
      return {
        id: String(row.id || ""),
        createdAt: String(row.createdAt || ""),
        q1: String(row.rating),
        q2: resolveQ2Id(row.question),
        askBen: String(row.reflection || ""),
        name: row.name || null,
        team: row.team || null,
        howItLanded: q1SheetLabel(String(row.rating)),
        whatStoodOut: q2SheetLabel(resolveQ2Id(row.question)) || String(row.question || ""),
      }
    }

    return null
  }

  function isModernResponse(row) {
    const n = normalizeResponse(row)
    return Boolean(n && n.q1 && n.q2)
  }

  function buildCreatePayload(entry) {
    const q1Label = entry.howItLanded || q1SheetLabel(entry.q1)
    const q2Label = entry.whatStoodOut || q2SheetLabel(entry.q2)
    return {
      action: "create",
      sessionId: entry.sessionId || "",
      q1: entry.q1,
      q2: entry.q2,
      askBen: entry.askBen || "",
      notes: entry.askBen || "",
      name: entry.name || "",
      team: entry.team || "",
      q1Label,
      q2Label,
      whatStoodOut: q2Label,
      // Legacy Apps Script bridge (still deployed for some setups)
      rating: Number(entry.q1),
      reflection: entry.askBen || "",
      question: q2Label,
    }
  }

  async function apiRequest(payload) {
    if (!scriptUrl) throw new Error("Sheet backend is not configured.")

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

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }

  async function apiRequestWithRetry(payload, attempts = 3) {
    let lastError
    for (let i = 0; i < attempts; i++) {
      try {
        return await apiRequest(payload)
      } catch (err) {
        lastError = err
        if (i < attempts - 1) await sleep(400 * Math.pow(2, i))
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Could not reach the Sheet.")
  }

  async function syncEntryToSheet(entry) {
    const data = await apiRequestWithRetry(buildCreatePayload(entry), 3)
    if (!data || !data.ok) throw new Error("Sheet did not confirm the save.")
    removeLocalResponse(entry.id)
    return data
  }

  async function flushPendingToSheet() {
    const pending = readLocalResponses().filter(isModernResponse)
    let synced = 0
    let failed = 0
    for (const entry of pending) {
      try {
        await syncEntryToSheet(entry)
        synced += 1
      } catch {
        failed += 1
      }
    }
    return { synced, failed }
  }

  function track(event, step, meta) {
    void apiRequest({
      action: "event",
      sessionId: state.sessionId,
      event,
      step: step || "",
      meta: meta || "",
    }).catch(() => {})
  }

  /* ---------- Cover ---------- */

  function renderCover() {
    const slideshow = document.getElementById("cover-slideshow")
    const recapEl = document.getElementById("cover-recap")
    const coverMeta = content.cover || {}

    if (coverMeta.eyebrow) document.getElementById("cover-eyebrow").textContent = coverMeta.eyebrow
    if (coverMeta.title) document.getElementById("cover-title").textContent = coverMeta.title
    if (coverMeta.lead) document.getElementById("cover-lead").textContent = coverMeta.lead

    const images = Array.isArray(content.coverImages) ? content.coverImages : []
    slideshow.innerHTML = images
      .map(
        (img, i) =>
          `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || "")}" class="${i === 0 ? "is-active" : ""}" />`,
      )
      .join("")

    const recap = content.recap || {}
    const introEl = document.getElementById("recap-intro")
    if (introEl && recap.intro) introEl.textContent = recap.intro

    const highlights = Array.isArray(recap.highlights) ? recap.highlights : []
    const quote = recap.featuredQuote || ""
    recapEl.innerHTML = `
      ${
        quote
          ? `<blockquote class="recap-featured"><p>“${escapeHtml(quote)}”</p></blockquote>`
          : ""
      }
      ${
        highlights.length
          ? `<div class="recap-highlights">
              <p class="recap-takeaways-label">Session highlights</p>
              <ul>
                ${highlights
                  .map(
                    (item) => `
                  <li>
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.body)}</span>
                  </li>`,
                  )
                  .join("")}
              </ul>
            </div>`
          : ""
      }`

    startSlideshow(slideshow)
  }

  function startSlideshow(slideshow) {
    const slides = [...slideshow.querySelectorAll("img")]
    if (slides.length < 2) return
    let index = 0

    if (state.slideshowTween) {
      if (typeof state.slideshowTween.kill === "function") state.slideshowTween.kill()
      else clearInterval(state.slideshowTween)
      state.slideshowTween = null
    }

    if (gsap && !reduceMotion) {
      gsap.set(slides, { opacity: 0, scale: 1.08 })
      gsap.set(slides[0], { opacity: 1, scale: 1 })
      const cycle = () => {
        const current = slides[index]
        const nextIndex = (index + 1) % slides.length
        const next = slides[nextIndex]
        const tl = gsap.timeline({
          onComplete: () => {
            index = nextIndex
            state.slideshowTween = gsap.delayedCall(2.8, cycle)
          },
        })
        tl.to(current, { opacity: 0, scale: 1.04, duration: 0.7, ease: "power2.inOut" }, 0).fromTo(
          next,
          { opacity: 0, scale: 1.12 },
          { opacity: 1, scale: 1, duration: 0.85, ease: "power2.out" },
          0.05,
        )
      }
      state.slideshowTween = gsap.delayedCall(2.8, cycle)
    } else {
      state.slideshowTween = window.setInterval(() => {
        slides[index].classList.remove("is-active")
        index = (index + 1) % slides.length
        slides[index].classList.add("is-active")
      }, 3500)
    }
  }

  function playIntro() {
    if (!gsap || reduceMotion) return
    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .from(".cinema-stage", { opacity: 0, scale: 1.03, duration: 1, ease: "power2.out" })
      .from("#cover-eyebrow", { y: 16, opacity: 0, duration: 0.45 }, "-=0.5")
      .from("#cover-title", { y: 28, opacity: 0, duration: 0.65 }, "-=0.3")
      .from("#cover-lead", { y: 16, opacity: 0, duration: 0.45 }, "-=0.4")
      .from(".recap-panel", { y: 20, opacity: 0, duration: 0.5 }, "-=0.2")
      .from(".form-page", { y: 18, opacity: 0, duration: 0.5 }, "-=0.25")
  }

  /* ---------- Choices ---------- */

  function renderChoices(questionKey, containerId, titleId) {
    const q = content[questionKey]
    const container = document.getElementById(containerId)
    const title = document.getElementById(titleId)
    if (!q || !container || !title) return

    title.textContent = q.prompt
    container.setAttribute("aria-label", q.prompt)
    container.innerHTML = ""

    const isRating = q.type === "rating"

    for (const choice of q.choices || []) {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.dataset.choiceId = choice.id

      if (isRating) {
        btn.className = "rating-btn"
        btn.setAttribute("role", "radio")
        btn.setAttribute("aria-checked", "false")
        btn.setAttribute("aria-label", choice.ariaLabel || `${choice.label} of 5`)
        btn.innerHTML = `
          <span class="rating-emoji" aria-hidden="true">${choice.emoji || choice.label}</span>
          <span class="rating-num" aria-hidden="true">${escapeHtml(choice.label)}</span>`
      } else {
        btn.className = "choice-btn"
        btn.setAttribute("aria-pressed", "false")
        btn.innerHTML = `<span>${escapeHtml(choice.label)}</span><span class="choice-check" aria-hidden="true">✓</span>`
      }

      btn.addEventListener("click", () => selectChoice(questionKey, btn, choice.id, container))
      container.appendChild(btn)
    }
  }

  function selectChoice(questionKey, btn, choiceId, container) {
    const selectable = container.querySelectorAll(".choice-btn, .rating-btn")
    selectable.forEach((b) => {
      b.classList.remove("is-selected")
      if (b.getAttribute("role") === "radio") b.setAttribute("aria-checked", "false")
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", "false")
    })
    btn.classList.add("is-selected")
    if (btn.getAttribute("role") === "radio") btn.setAttribute("aria-checked", "true")
    if (btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", "true")

    if (questionKey === "q1") {
      state.q1 = choiceId
      track("q1_select", "q1", choiceId)
    } else {
      state.q2 = choiceId
      track("q2_select", "q2", choiceId)
    }

    showError("")
  }

  function renderAsk() {
    const ask = content.ask || {}
    document.getElementById("ask-title").textContent = ask.prompt || "Anything else you’d like to share?"
    document.getElementById("ask-lead").textContent = ask.lead || ""
    document.getElementById("ask-input").placeholder = ask.placeholder || "Write freely…"
  }

  function showError(message) {
    const el = document.getElementById("form-error")
    el.hidden = !message
    el.textContent = message || ""
  }

  async function submitResponse({ askBen, name, team }) {
    if (!state.q1 || !state.q2) {
      throw new Error("Pick a rating and what stood out before submitting.")
    }

    const entry = {
      id: "fb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      sessionId: state.sessionId,
      q1: state.q1,
      q2: state.q2,
      askBen: askBen || "",
      name: name || null,
      team: team || null,
      howItLanded: q1SheetLabel(state.q1),
      whatStoodOut: q2SheetLabel(state.q2),
    }

    saveLocalResponse(entry)

    try {
      await syncEntryToSheet(entry)
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error"
      throw new Error(
        `Couldn’t save to Google Sheets (${detail}). Your answers are kept on this device — tap Submit again.`,
      )
    }

    markSubmitted()
    track("submit", "form", askBen ? "with_note" : "no_note")
    return entry
  }

  function countBy(responses, key) {
    const counts = {}
    for (const row of responses) {
      const id = row[key]
      if (!id) continue
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }

  function renderAggBlock(title, questionKey, counts, total) {
    const q = content[questionKey]
    if (!q) return ""

    const rows = (q.choices || [])
      .map((c) => {
        const n = counts[c.id] || 0
        const pct = total ? Math.round((n / total) * 100) : 0
        const label = c.emoji ? `${c.emoji} ${c.label}` : c.label
        return `
          <div class="agg-bar" data-pct="${pct}">
            <span class="agg-label">${escapeHtml(label)}</span>
            <span class="agg-track"><span class="agg-fill"></span></span>
            <span class="agg-count">${n}</span>
          </div>`
      })
      .join("")

    return `
      <div class="agg-block">
        <h3>${escapeHtml(title)}</h3>
        ${rows || `<p class="muted">No answers yet.</p>`}
      </div>`
  }

  function renderAggregates(responses) {
    const root = document.getElementById("aggregates")
    const askBlock = document.getElementById("ask-list-block")
    const askList = document.getElementById("ask-list")

    if (!responses.length) {
      root.innerHTML = `<p class="muted">No responses yet. You’re early.</p>`
      askBlock.hidden = true
      return
    }

    const total = responses.length
    root.innerHTML =
      `<p class="muted">${total} response${total === 1 ? "" : "s"}</p>` +
      renderAggBlock(content.q1.prompt, "q1", countBy(responses, "q1"), total) +
      renderAggBlock(content.q2.prompt, "q2", countBy(responses, "q2"), total)

    root.querySelectorAll(".agg-bar").forEach((bar) => {
      const fill = bar.querySelector(".agg-fill")
      fill.style.width = `${bar.dataset.pct || 0}%`
    })

    const asks = responses.filter((r) => (r.askBen || "").trim())
    if (!asks.length) {
      askBlock.hidden = true
      return
    }

    askBlock.hidden = false
    askList.innerHTML = asks
      .map((r) => {
        const who = [r.name, r.team].filter(Boolean).join(" · ") || "Anonymous"
        return `<li>${escapeHtml(r.askBen)}<span class="ask-meta">${escapeHtml(who)}</span></li>`
      })
      .join("")
  }

  function mergeResponses(remote, local) {
    const map = new Map()
    for (const row of [...local, ...remote]) {
      const n = normalizeResponse(row)
      if (!n || !n.q1) continue
      const key = n.id || `${n.createdAt}-${n.q1}-${n.q2}`
      if (!map.has(key)) map.set(key, n)
    }
    return [...map.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }

  async function loadAggregates() {
    const root = document.getElementById("aggregates")
    root.innerHTML = `<p class="muted">Loading…</p>`

    const flush = await flushPendingToSheet()
    const local = readLocalResponses()
    let remote = []
    let remoteOk = false

    try {
      const data = await apiRequestWithRetry({ action: "list" }, 2)
      remote = Array.isArray(data.responses) ? data.responses : []
      remoteOk = true
    } catch {
      /* local fallback */
    }

    const remoteNorm = remote.map(normalizeResponse).filter(Boolean)
    const rows =
      remoteOk && remoteNorm.length ? remoteNorm : mergeResponses(remoteNorm, local)
    renderAggregates(rows)

    const status = document.getElementById("sync-status")
    if (status) {
      if (flush.failed > 0 || (!remoteOk && local.length)) {
        status.hidden = false
        status.textContent =
          "Some answers are still syncing to the Sheet. Keep this tab open or tap Refresh."
      } else if (flush.synced > 0) {
        status.hidden = false
        status.textContent = "Synced saved answers to Google Sheets."
      } else {
        status.hidden = true
        status.textContent = ""
      }
    }
  }

  function burstConfetti() {
    if (reduceMotion) return
    const colors = ["#5eb8c2", "#2f8a93", "#3d9ea8", "#5dceaf", "#e9f7f8", "#ffffff"]
    if (typeof window.confetti !== "function") return
    const fire = (opts) => window.confetti({ zIndex: 90, disableForReducedMotion: true, colors, ...opts })
    fire({ particleCount: 80, spread: 70, startVelocity: 40, origin: { x: 0.5, y: 0.55 } })
    window.setTimeout(() => {
      fire({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0.1, y: 0.7 } })
      fire({ particleCount: 40, angle: 120, spread: 55, origin: { x: 0.9, y: 0.7 } })
    }, 160)
  }

  function showResults({ celebrate }) {
    document.getElementById("feedback-form").hidden = true
    const results = document.getElementById("results")
    results.hidden = false
    if (celebrate) burstConfetti()
    void loadAggregates()
    results.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
  }

  /* ---------- Wire ---------- */

  const form = document.getElementById("feedback-form")
  const submitBtn = document.getElementById("form-submit")
  const submitLabel = submitBtn.querySelector("span") || submitBtn

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    showError("")

    const fd = new FormData(form)
    if ((fd.get("website") || "").toString().trim()) {
      showResults({ celebrate: false })
      return
    }

    if (!state.q1) {
      showError("Pick how the session landed.")
      document.getElementById("q1-choices").scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    if (!state.q2) {
      showError("Pick what stood out the most.")
      document.getElementById("q2-choices").scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    const askBen = (fd.get("askBen") || "").toString().trim()
    const name = (fd.get("name") || "").toString().trim()
    const team = (fd.get("team") || "").toString().trim()

    submitBtn.disabled = true
    submitLabel.textContent = "Saving…"

    try {
      await submitResponse({ askBen, name, team })
      showResults({ celebrate: true })
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send feedback.")
    } finally {
      submitBtn.disabled = false
      submitLabel.textContent = "Submit feedback"
    }
  })

  document.getElementById("refresh-btn").addEventListener("click", () => {
    void loadAggregates()
  })

  // Boot
  renderCover()
  renderChoices("q1", "q1-choices", "q1-title")
  renderChoices("q2", "q2-choices", "q2-title")
  renderAsk()
  void flushPendingToSheet()

  if (state.submitted) {
    showResults({ celebrate: false })
  } else {
    playIntro()
    track("cover_view", "form")
  }

  if (!gsap) console.warn("GSAP failed to load — falling back to simple transitions.")
})()
