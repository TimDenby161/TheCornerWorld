// The trip-planning page: fades sections in, keeps the price in step with the trip length,
// and turns the brief into an email to the address in data/site.json (contactEmail).
document.documentElement.classList.add("js");

const PRICES = { short: [79, "Short trip"], standard: [149, "Standard plan"], big: [229, "Big trip"] };
const form = document.getElementById("brief");
const quote = document.getElementById("quote");
const msg = document.getElementById("brief-msg");
let contactEmail = "";

fetch("../data/site.json").then(r => r.json()).then(s => { contactEmail = (s.contactEmail || "").trim(); }).catch(() => {});

// Fade in as things scroll into view
const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}, { rootMargin: "0px 0px -8% 0px" }) : null;
document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

function showQuote() {
  const p = PRICES[form.days.value];
  quote.replaceChildren();
  if (!p) { quote.textContent = "Choose a trip length to see the price"; return; }
  const b = document.createElement("b"); b.textContent = "£" + p[0];
  quote.append(b, p[1]);
}
form.days.addEventListener("change", showQuote);

// "Choose …" on a price card picks that length in the form
document.querySelectorAll("[data-tier]").forEach(a => a.addEventListener("click", () => {
  form.days.value = a.dataset.tier; showQuote();
  setTimeout(() => form.where.focus({ preventScroll: true }), 400);
}));

function briefText() {
  const v = n => (form[n].value || "").trim() || "—";
  const likes = [...form.querySelectorAll('input[name="likes"]:checked')].map(i => i.value).join(", ") || "—";
  const p = PRICES[form.days.value];
  return [
    `Where: ${v("where")}`,
    `When: ${v("when")}`,
    `How long: ${form.days.selectedOptions[0]?.text || "—"}${p ? ` (${p[1]}, £${p[0]})` : ""}`,
    `Who's going: ${v("who")}`,
    `Flying from: ${v("from")}`,
    `Budget: ${v("budget")}`,
    `Pace: ${v("pace")}`,
    `Loves: ${likes}`,
    `Hotels: ${v("hotels")}`,
    `Anything else: ${v("notes")}`,
    "",
    `Name: ${v("name")}`,
  ].join("\n");
}

function say(text) { msg.textContent = text; msg.hidden = false; }

async function copyBrief() {
  // The clipboard can hang waiting for permission, so give up after a second
  const timeout = new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 1000));
  try { await Promise.race([navigator.clipboard.writeText(briefText()), timeout]); return true; } catch { return false; }
}

document.getElementById("copy-brief").addEventListener("click", async () => {
  say(await copyBrief() ? "Copied. Paste it into an email or message to us." : "Couldn't copy here. Select the answers and copy them yourself.");
});

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!form.where.value.trim()) { form.where.focus(); say("Tell us where you'd like to go first."); return; }
  if (!contactEmail) {
    say(await copyBrief() ? "Bookings open very soon. Your answers are copied, so keep them for when they do." : "Bookings open very soon.");
    return;
  }
  const subject = `Trip planning: ${form.where.value.trim()}`;
  location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(briefText())}`;
  say(`Your email app should open with your answers in it. If it doesn't, email them to ${contactEmail}.`);
});

showQuote();
