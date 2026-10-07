;(() => {
  const content = window.FEEDBACK_CONTENT || {}
  const scriptUrl = (window.FEEDBACK_CONFIG && window.FEEDBACK_CONFIG.SCRIPT_URL || "").trim()
  const SESSION_KEY = "ben-ux-vision-session"
  const LOCAL_RESPONSES_KEY = "ben-ux-vision-responses"
  const SUBMITTED_KEY = "ben-ux-vision-submitted"
  const EPOCH_KEY = "ben-ux-vision-epoch"
  /** Bump to wipe local test responses / submitted flags before a team share. */
  const DATA_EPOCH = "launch-2026-10-07"
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const gsap = window.gsap

  const steps = {
    cover: document.getElementById("step-cover"),
    q1: document.getElementById("step-q1"),
    q2: document.getElementById("step-q2"),
    ask: document.getElementById("step-ask"),
    done: document.getElementById("step-done"),
  }

  const STEP_ORDER = ["cover", "q1", "q2", "ask", "done"]

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
    currentStep: "cover",
    transitioning: false,
    slideshowTween: null,
    choiceLocked: false,
    activeTimeline: null,
    submitted: hasSubmitted(),
  }

  function getOrCreateSessionId() {
    try {
      let id = localStorage.getItem(SESSION_KEY)
      if (!id) {
        id =
          "s_" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2, 10)
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

  function updateJourney(active) {
    const idx = STEP_ORDER.indexOf(active)
    document.querySelectorAll(".journey-dot").forEach((dot) => {
      const i = STEP_ORDER.indexOf(dot.dataset.dot)
      dot.classList.toggle("is-active", i === idx)
      dot.classList.toggle("is-done", i < idx)
    })
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
      // ignore quota / private mode
    }
  }

  function saveLocalResponse(entry) {
    const list = readLocalResponses()
    list.unshift(entry)
    writeLocalResponses(list)
    return entry
  }

  function isModernResponse(row) {
    return row && typeof row.q1 === "string" && row.q1 && typeof row.q2 === "string" && row.q2
  }

  async function apiRequest(payload) {
    if (!scriptUrl) {
      throw new Error("NO_SCRIPT_URL")
    }

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

  function track(event, step, meta) {
    void apiRequest({
      action: "event",
      sessionId: state.sessionId,
      event,
      step: step || "",
      meta: meta || "",
    }).catch(() => {})
  }

  function resetStepStyles(stepEl) {
    if (!stepEl) return
    if (gsap) {
      gsap.killTweensOf(stepEl)
      gsap.killTweensOf(
        stepEl.querySelectorAll(
          ".choice-btn, .rating-btn, .focus-title, .progress-wrap, .field, .btn-row, .section-lead, .done-mark, .progress-fill",
        ),
      )
      gsap.set(stepEl, { clearProps: "transform,opacity,filter" })
      gsap.set(
        stepEl.querySelectorAll(
          ".choice-btn, .rating-btn, .focus-title, .progress-wrap, .field, .btn-row, .section-lead, .done-mark",
        ),
        { clearProps: "transform,opacity" },
      )
    }
    stepEl.querySelectorAll(".choice-btn, .rating-btn").forEach((btn) => {
      btn.classList.remove("is-selected")
      btn.style.opacity = ""
      btn.style.transform = ""
    })
  }

  /* ---------- Cover ---------- */

  function renderCover() {
    const slideshow = document.getElementById("cover-slideshow")
    const recapEl = document.getElementById("cover-recap")
    const coverMeta = content.cover || {}

    if (coverMeta.eyebrow) {
      document.getElementById("cover-eyebrow").textContent = coverMeta.eyebrow
    }
    if (coverMeta.title) {
      document.getElementById("cover-title").textContent = coverMeta.title
    }
    if (coverMeta.lead) {
      document.getElementById("cover-lead").textContent = coverMeta.lead
    }

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
          ? `<blockquote class="recap-featured">
              <p>“${escapeHtml(quote)}”</p>
            </blockquote>`
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
      state.slideshowTween.kill()
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

        tl.to(current, { opacity: 0, scale: 1.04, duration: 0.7, ease: "power2.inOut" }, 0)
          .fromTo(
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

  function stopSlideshow() {
    if (!state.slideshowTween) return
    if (typeof state.slideshowTween.kill === "function") {
      state.slideshowTween.kill()
    } else {
      clearInterval(state.slideshowTween)
    }
    state.slideshowTween = null
  }

  function playCoverIntro() {
    if (!gsap || reduceMotion) return

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tl.from(".cinema-stage", { opacity: 0, scale: 1.03, duration: 1.1, ease: "power2.out" })
      .from("#cover-eyebrow", { y: 16, opacity: 0, duration: 0.5 }, "-=0.55")
      .from("#cover-title", { y: 36, opacity: 0, duration: 0.75 }, "-=0.35")
      .from("#cover-lead", { y: 18, opacity: 0, duration: 0.5 }, "-=0.45")
      .from(".cinema-action", { y: 16, opacity: 0, duration: 0.45 }, "-=0.25")
      .from(".recap-panel", { y: 24, opacity: 0, duration: 0.55 }, "-=0.2")
      .from(".recap-featured", { y: 16, opacity: 0, duration: 0.45 }, "-=0.25")
      .from(".recap-highlights li", { y: 10, opacity: 0, stagger: 0.07, duration: 0.35 }, "-=0.2")
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
        btn.innerHTML = `<span>${escapeHtml(choice.label)}</span><span class="choice-check" aria-hidden="true">✓</span>`
      }

      btn.addEventListener("click", () => {
        if (state.choiceLocked || state.transitioning) return
        selectChoice(questionKey, btn, choice.id, container)
      })

      container.appendChild(btn)
    }
  }

  function selectChoice(questionKey, btn, choiceId, container) {
    state.choiceLocked = true
    const selectable = container.querySelectorAll(".choice-btn, .rating-btn")
    selectable.forEach((b) => {
      b.classList.remove("is-selected")
      if (b.getAttribute("role") === "radio") b.setAttribute("aria-checked", "false")
    })
    btn.classList.add("is-selected")
    if (btn.getAttribute("role") === "radio") btn.setAttribute("aria-checked", "true")

    const advance = () => {
      if (questionKey === "q1") {
        state.q1 = choiceId
        track("q1_select", "q1", choiceId)
        goToStep("q2")
      } else {
        state.q2 = choiceId
        track("q2_select", "q2", choiceId)
        goToStep("ask")
      }
    }

    if (gsap && !reduceMotion) {
      const others = [...selectable].filter((b) => b !== btn)
      const tl = gsap.timeline({ onComplete: advance })
      tl.to(btn, { scale: 1.04, duration: 0.16, ease: "back.out(2)" })
        .to(others, { opacity: 0.4, duration: 0.2, ease: "power2.out" }, 0.04)
        .to({}, { duration: 0.22 })
    } else {
      window.setTimeout(advance, 160)
    }
  }

  /* ---------- Step transitions (single pass — no double load) ---------- */

  function enterTargets(stepEl, name) {
    if (name === "q1" || name === "q2") {
      return [
        stepEl.querySelector(".progress-wrap"),
        stepEl.querySelector(".focus-title"),
        ...stepEl.querySelectorAll(".choice-btn, .rating-btn"),
      ].filter(Boolean)
    }
    if (name === "ask") {
      return [
        stepEl.querySelector(".progress-wrap"),
        stepEl.querySelector(".focus-title"),
        stepEl.querySelector(".section-lead"),
        ...stepEl.querySelectorAll("#ask-form .field"),
        stepEl.querySelector(".btn-row"),
      ].filter(Boolean)
    }
    if (name === "done") {
      return [
        stepEl.querySelector(".done-mark"),
        stepEl.querySelector(".focus-title"),
        stepEl.querySelector(".section-lead"),
      ].filter(Boolean)
    }
    return [stepEl]
  }

  function focusStep(stepEl) {
    const heading = stepEl.querySelector(".focus-title, .hero-title, h1, h2")
    if (!heading) return
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1")
    try {
      heading.focus({ preventScroll: true })
    } catch {
      heading.focus()
    }
  }

  function goToStep(name) {
    if (state.transitioning || name === state.currentStep) return
    const from = steps[state.currentStep]
    const to = steps[name]
    if (!to) return

    state.transitioning = true
    state.choiceLocked = false

    if (state.activeTimeline) {
      try {
        state.activeTimeline.kill()
      } catch {
        /* ignore */
      }
      state.activeTimeline = null
    }

    if (name !== "cover") stopSlideshow()

    const finishEnter = () => {
      state.transitioning = false
      resetStepStyles(to)
      focusStep(to)
      if (name === "done") {
        // Celebrate only when arriving from the form, not on refresh resume.
        if (from && from.dataset.step === "ask") burstConfetti()
        void loadAggregates()
      }
    }

    const reveal = () => {
      if (from) {
        from.hidden = true
        resetStepStyles(from)
      }
      to.hidden = false
      state.currentStep = name
      updateJourney(name)
      window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" })
    }

    if (!gsap || reduceMotion) {
      reveal()
      finishEnter()
      return
    }

    const targets = enterTargets(to, name)

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: finishEnter,
    })
    state.activeTimeline = tl

    if (from && !from.hidden) {
      tl.to(from, {
        opacity: 0,
        y: -12,
        duration: 0.2,
        ease: "power2.in",
      })
    }

    tl.add(() => {
      reveal()
      gsap.set(to, { opacity: 1, y: 0, filter: "none" })
      if (targets.length) gsap.set(targets, { opacity: 0, y: 16 })

      const fill = to.querySelector(".progress-fill")
      if (fill) {
        const start =
          name === "q1" ? "0%" : name === "q2" ? "33%" : name === "ask" ? "66%" : "0%"
        gsap.set(fill, { width: start })
      }
    })

    if (targets.length) {
      tl.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.04,
      })
    }

    const fill = to.querySelector(".progress-fill")
    if (fill && (name === "q1" || name === "q2" || name === "ask")) {
      const end = name === "q1" ? "33%" : name === "q2" ? "66%" : "100%"
      tl.to(
        fill,
        {
          width: end,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.25",
      )
    }
  }

  function burstConfetti() {
    if (reduceMotion) return

    const colors = ["#5eb8c2", "#2f8a93", "#3d9ea8", "#5dceaf", "#e9f7f8", "#ffffff", "#0b535b"]

    // Prefer canvas-confetti when available (richer physics + shapes)
    if (typeof window.confetti === "function") {
      const fire = (opts) =>
        window.confetti({
          zIndex: 90,
          disableForReducedMotion: true,
          colors,
          ...opts,
        })

      // Center pop
      fire({
        particleCount: 90,
        spread: 72,
        startVelocity: 42,
        origin: { x: 0.5, y: 0.58 },
        scalar: 1.05,
      })

      // Side cannons
      window.setTimeout(() => {
        fire({
          particleCount: 55,
          angle: 60,
          spread: 58,
          startVelocity: 48,
          origin: { x: 0.08, y: 0.7 },
        })
        fire({
          particleCount: 55,
          angle: 120,
          spread: 58,
          startVelocity: 48,
          origin: { x: 0.92, y: 0.7 },
        })
      }, 160)

      // Soft sky rain
      window.setTimeout(() => {
        fire({
          particleCount: 70,
          spread: 120,
          startVelocity: 28,
          gravity: 0.85,
          ticks: 260,
          origin: { x: 0.5, y: 0 },
          scalar: 0.9,
        })
      }, 380)

      // Final sparkle burst
      window.setTimeout(() => {
        fire({
          particleCount: 40,
          spread: 360,
          startVelocity: 22,
          decay: 0.92,
          scalar: 0.75,
          origin: { x: 0.5, y: 0.45 },
        })
      }, 700)

      return
    }

    // GSAP fallback if CDN blocked
    const layer = document.getElementById("confetti")
    if (!layer || !gsap) return
    layer.innerHTML = ""

    const shapes = ["rect", "circle", "ribbon"]
    const count = 64
    const originX = window.innerWidth / 2
    const originY = window.innerHeight * 0.45

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span")
      const shape = shapes[i % shapes.length]
      const size = 6 + Math.random() * 8
      el.className = `confetti-piece confetti-piece--${shape}`
      el.style.left = `${originX}px`
      el.style.top = `${originY}px`
      el.style.background = colors[i % colors.length]
      if (shape === "rect") {
        el.style.width = `${size}px`
        el.style.height = `${size * (1.2 + Math.random())}px`
      } else if (shape === "circle") {
        el.style.width = `${size}px`
        el.style.height = `${size}px`
      } else {
        el.style.width = `${2 + Math.random() * 3}px`
        el.style.height = `${14 + Math.random() * 18}px`
      }
      layer.appendChild(el)

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
      const power = 180 + Math.random() * 280
      const driftX = Math.cos(angle) * power
      const peakY = -80 - Math.random() * 160

      gsap
        .timeline({ onComplete: () => el.remove() })
        .fromTo(
          el,
          { x: 0, y: 0, opacity: 1, scale: 0.6, rotation: Math.random() * 180 },
          {
            x: driftX * 0.45,
            y: peakY,
            scale: 1,
            rotation: `+=${120 + Math.random() * 200}`,
            duration: 0.45 + Math.random() * 0.2,
            ease: "power2.out",
          },
        )
        .to(el, {
          x: driftX,
          y: window.innerHeight - originY + 40,
          rotation: `+=${360 + Math.random() * 480}`,
          opacity: 0,
          duration: 1.4 + Math.random() * 0.9,
          ease: "power1.in",
        })
    }
  }

  function renderAsk() {
    const ask = content.ask || {}
    document.getElementById("ask-title").textContent = ask.prompt || "Ask Ben anything"
    document.getElementById("ask-lead").textContent = ask.lead || "Optional — skip if you’re done."
    document.getElementById("ask-input").placeholder =
      ask.placeholder || "One question you’d want him to weigh in on…"
  }

  function showError(message) {
    const el = document.getElementById("form-error")
    el.hidden = !message
    el.textContent = message || ""
    if (message && gsap && !reduceMotion) {
      gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.35, ease: "elastic.out(1, 0.4)" })
    }
  }

  async function submitResponse({ askBen, name, team, skipped }) {
    if (!state.q1 || !state.q2) {
      throw new Error("Pick both answers before submitting.")
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
    }

    let synced = false
    try {
      await apiRequest({
        action: "create",
        sessionId: entry.sessionId,
        q1: entry.q1,
        q2: entry.q2,
        askBen: entry.askBen,
        name: entry.name || "",
        team: entry.team || "",
      })
      synced = true
      // Drop stale local fallbacks once the Sheet accepts a write.
      try {
        localStorage.removeItem(LOCAL_RESPONSES_KEY)
      } catch {
        /* ignore */
      }
    } catch {
      // Offline / undeployed script — keep the response locally so the form still completes.
      saveLocalResponse(entry)
    }

    markSubmitted()
    track(skipped ? "ask_skip" : "submit", "ask", skipped ? "skip" : "with_question")
    entry._synced = synced
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

    const q1Counts = countBy(responses, "q1")
    const q2Counts = countBy(responses, "q2")
    const total = responses.length

    root.innerHTML =
      `<p class="muted">${total} response${total === 1 ? "" : "s"}</p>` +
      renderAggBlock(content.q1.prompt, "q1", q1Counts, total) +
      renderAggBlock(content.q2.prompt, "q2", q2Counts, total)

    if (gsap && !reduceMotion) {
      root.querySelectorAll(".agg-bar").forEach((bar) => {
        const fill = bar.querySelector(".agg-fill")
        const pct = Number(bar.dataset.pct || 0)
        gsap.fromTo(fill, { width: "0%" }, { width: `${pct}%`, duration: 0.85, ease: "power2.out" })
      })
      gsap.from(root.querySelectorAll(".agg-block"), {
        y: 16,
        opacity: 0,
        stagger: 0.12,
        duration: 0.45,
        ease: "power3.out",
      })
    } else {
      root.querySelectorAll(".agg-bar").forEach((bar) => {
        const fill = bar.querySelector(".agg-fill")
        fill.style.width = `${bar.dataset.pct || 0}%`
      })
    }

    const asks = responses.filter((r) => (r.askBen || "").trim())
    if (!asks.length) {
      askBlock.hidden = true
      askList.innerHTML = ""
      return
    }

    askBlock.hidden = false
    askList.innerHTML = asks
      .map((r) => {
        const who = [r.name, r.team].filter(Boolean).join(" · ") || "Anonymous"
        return `<li>${escapeHtml(r.askBen)}<span class="ask-meta">${escapeHtml(who)}</span></li>`
      })
      .join("")

    if (gsap && !reduceMotion) {
      gsap.from("#ask-list li", {
        y: 12,
        opacity: 0,
        stagger: 0.06,
        duration: 0.4,
        ease: "power2.out",
      })
    }
  }

  function mergeResponses(remote, local) {
    const map = new Map()
    for (const row of [...local, ...remote]) {
      if (!isModernResponse(row)) continue
      const key = row.id || `${row.sessionId || ""}-${row.createdAt || ""}-${row.q1}-${row.q2}`
      if (!map.has(key)) map.set(key, row)
    }
    return [...map.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }

  async function loadAggregates() {
    const root = document.getElementById("aggregates")
    root.innerHTML = `<p class="muted" id="aggregates-status">Loading…</p>`

    const local = readLocalResponses()
    let remote = []
    let remoteOk = false

    try {
      const data = await apiRequest({ action: "list" })
      remote = Array.isArray(data.responses) ? data.responses : []
      remoteOk = true
    } catch {
      // fall through to local-only
    }

    const remoteModern = remote.filter(isModernResponse)
    // Prefer Sheet once it has choose-based rows; otherwise keep local fallbacks.
    const rows =
      remoteOk && remoteModern.length
        ? remoteModern
        : mergeResponses(remoteModern, local)
    renderAggregates(rows)
  }

  function goToDone() {
    stopSlideshow()
    goToStep("done")
  }

  /* ---------- Wire UI ---------- */

  const coverCta = document.getElementById("cover-cta")
  coverCta.addEventListener("click", () => {
    if (state.transitioning) return
    if (state.submitted) {
      goToStep("done")
      return
    }
    track("cover_cta", "cover")
    goToStep("q1")
  })

  const askForm = document.getElementById("ask-form")
  const askSubmit = document.getElementById("ask-submit")
  const askSkip = document.getElementById("ask-skip")
  const askSubmitLabel = askSubmit.querySelector("span") || askSubmit

  async function finishAsk({ skipped }) {
    if (state.submitted) {
      goToDone()
      return
    }

    showError("")
    const fd = new FormData(askForm)

    if ((fd.get("website") || "").toString().trim()) {
      goToDone()
      return
    }

    const askBen = skipped ? "" : (fd.get("askBen") || "").toString().trim()
    const name = (fd.get("name") || "").toString().trim()
    const team = (fd.get("team") || "").toString().trim()

    askSubmit.disabled = true
    askSkip.disabled = true
    askSubmitLabel.textContent = "Sending…"

    try {
      await submitResponse({ askBen, name, team, skipped })
      goToDone()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send feedback.")
    } finally {
      askSubmit.disabled = false
      askSkip.disabled = false
      askSubmitLabel.textContent = "Submit"
    }
  }

  askForm.addEventListener("submit", (event) => {
    event.preventDefault()
    void finishAsk({ skipped: false })
  })

  askSkip.addEventListener("click", () => {
    void finishAsk({ skipped: true })
  })

  document.getElementById("refresh-btn").addEventListener("click", () => {
    void loadAggregates()
  })

  // Boot
  renderCover()
  renderChoices("q1", "q1-choices", "q1-title")
  renderChoices("q2", "q2-choices", "q2-title")
  renderAsk()

  if (state.submitted) {
    // Resume results after refresh — don’t re-run the form.
    const ctaLabel = coverCta.querySelector("span:not(.btn-meta)")
    if (ctaLabel) ctaLabel.textContent = "View results"
    const meta = coverCta.querySelector(".btn-meta")
    if (meta) meta.hidden = true
    steps.cover.hidden = true
    steps.done.hidden = false
    state.currentStep = "done"
    updateJourney("done")
    void loadAggregates()
  } else {
    updateJourney("cover")
    playCoverIntro()
    track("cover_view", "cover")
  }

  if (!gsap) {
    console.warn("GSAP failed to load — falling back to simple transitions.")
  }
})()
