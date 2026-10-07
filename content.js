/**
 * Swap photos / recap / questions here.
 * q1 ids: "1"–"5" · q2 ids must match Apps Script Q2_IDS · open text → askBen
 */
window.FEEDBACK_CONTENT = {
  coverImages: [
    { src: "photos/01-team-listening.jpg", alt: "Pune team listening during Ben’s UX Vision session" },
    { src: "photos/02-ben-speaking.jpg", alt: "Ben speaking to the room with remote teammates on screen" },
    { src: "photos/03-ben-ai-architect.jpg", alt: "Ben presenting the AI Service Architect vision" },
    { src: "photos/04-group.jpg", alt: "Group photo from Ben’s Pune UX Vision session" },
    { src: "ben-pune-cover.jpg", alt: "Ben presenting to the full Pune audience" },
  ],
  cover: {
    eyebrow: "Team pulse · Pune",
    title: "How did Ben’s vision land?",
    lead:
      "Ben’s UX Design Vision session was a few days ago — details fade fast. This form is a short pulse so we can see what landed for the room, what stood out, and anything you still want to share.",
  },
  recap: {
    intro:
      "Quick refresh of what Ben covered — skim this, then tell us what stuck for you.",
    featuredQuote:
      "Our customers’ ecosystem is changing. Zendesk design needs to be ready to incubate those changes.",
    highlights: [
      {
        title: "Project Loom",
        body:
          "Re-imagining Admin Center for a more self-driving Zendesk — a goal-oriented Command Center where admins set goals, get recommendations, ship changes, and track ROI. Moving fast toward Relate ’27, with AdminX, Admin Co-pilot, and Launchpad in the mix.",
      },
      {
        title: "Project Wrangler",
        body:
          "Pulling Launchpad and related experiences tighter into admin home and the broader admin surface — so setup and guidance show up where people already work, not as a side path.",
      },
      {
        title: "Changing customer ecosystem",
        body:
          "How customers buy, adopt, and expand is shifting. Design has to help Zendesk incubate those shifts — not just polish today’s UI.",
      },
      {
        title: "Headless products",
        body:
          "Some of what we design won’t ship as a classic UI. Headless work means shaping experiences, systems, and outcomes even when there’s no screen in the middle.",
      },
    ],
  },
  q1: {
    id: "q1",
    prompt: "Overall, how did the session land?",
    type: "rating",
    choices: [
      { id: "1", label: "1", emoji: "😕", ariaLabel: "1 of 5 — missed me" },
      { id: "2", label: "2", emoji: "😐", ariaLabel: "2 of 5 — a little thin" },
      { id: "3", label: "3", emoji: "🙂", ariaLabel: "3 of 5 — solid" },
      { id: "4", label: "4", emoji: "😊", ariaLabel: "4 of 5 — landed well" },
      { id: "5", label: "5", emoji: "🤩", ariaLabel: "5 of 5 — changed how I think" },
    ],
  },
  q2: {
    id: "q2",
    prompt: "What stood out the most?",
    type: "choice",
    choices: [
      { id: "design_vision", label: "Design vision for Zendesk" },
      { id: "project_wrangler", label: "Project Wrangler" },
      { id: "project_loom", label: "Project Loom" },
      {
        id: "customers_changing",
        label: "How customers are changing — and how we adapt",
      },
      { id: "headless", label: "Headless products (design beyond the UI)" },
    ],
  },
  ask: {
    prompt: "Anything else you’d like to share?",
    lead: "Optional — a thought, a question, or something we should follow up on.",
    placeholder: "Write freely…",
  },
}
