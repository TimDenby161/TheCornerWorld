// The Corner World: admin/, where the owner manages client trip pages: makes a trip, lists the email
// addresses that may open it, and publishes the page.
//
// Hiding this screen from everyone else is a courtesy, not the security. The database refuses every
// one of these changes unless the signed-in account is in private.admins (supabase/migrations/), and
// nothing on the site can add an account to that list.
(function () {
"use strict";

const account = window.tcwAccount;
const text = document.getElementById("admin-text"), body = document.getElementById("admin-body");
let db = null;

function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") node.textContent = v;
    else if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...kids.flat().filter(Boolean));
  return node;
}

let toastTimer;
function toast(message) {
  const t = document.getElementById("toast");
  t.textContent = message; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

// Runs a change, says so if the database refused it, and redraws the list
async function change(what, work) {
  try {
    const { error } = await work();
    if (error) throw error;
    toast(what);
  } catch (err) {
    console.error(err);
    toast(`That didn't work: ${err.message || "check your connection"}`);
  }
  await list();
}

// A finished trip page (the single trip.html the /travel-plan skill writes) as the three parts the
// database keeps: its markup, its styles and its script. Fonts and anything else it would fetch from
// another site are left behind: the page has system-font fallbacks, and the security policy would block them.
function parts(file, tripId) {
  const doc = new DOMParser().parseFromString(file, "text/html");
  const css = [...doc.querySelectorAll("style")].map((s) => s.textContent).join("\n").trim();
  const scripts = [...doc.querySelectorAll("script")];
  if (scripts.some((s) => s.src)) throw new Error("the page loads a script from another address, which the site won't run");
  let js = scripts.map((s) => s.textContent).join("\n").trim();
  for (const node of doc.querySelectorAll("script, style, link, title, meta, base")) node.remove();
  const html = doc.body.innerHTML.trim();
  if (!css || !js || !html) throw new Error("that doesn't look like a trip page: it needs styles, a script and some content");
  if (doc.body.attributes.length) throw new Error("the page's <body> tag has settings of its own, which can't be carried over");
  // Every page on the site shares one browser storage, so this trip's saved choices get their own prefix
  const gets = (js.match(/localStorage\.getItem\(k\)/g) || []).length, sets = (js.match(/localStorage\.setItem\(k, /g) || []).length;
  if (!gets || !sets) throw new Error("couldn't find where the page saves the client's choices: the trip template has changed, so update parts() in assets/admin.js");
  js = `const STORE_NS = ${JSON.stringify(`trip:${tripId}:`)};\n` + js.replace(/localStorage\.getItem\(k\)/g, "localStorage.getItem(STORE_NS + k)").replace(/localStorage\.setItem\(k, /g, "localStorage.setItem(STORE_NS + k, ");
  return { html, css, js };
}

function tripCard(trip) {
  const people = trip.client_trip_members || [], page = [trip.client_trip_pages].flat().filter(Boolean)[0];
  const email = el("input", { type: "email", placeholder: "client@example.com", "aria-label": `Email address to add to ${trip.title}`, autocomplete: "off" });
  const add = () => {
    const address = email.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) { email.focus(); return toast("That isn't an email address"); }
    change(`${address} can now open ${trip.title}`, () => db.from("client_trip_members").insert({ trip_id: trip.id, email: address }));
  };
  email.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  const file = el("input", { type: "file", accept: ".html,text/html", "aria-hidden": "true", tabindex: "-1", onchange: async () => {
    const picked = file.files[0];
    if (!picked) return;
    let content;
    try {
      const source = await picked.text();
      // The owner's own trips were the template's first examples; none of that should reach a client
      const left = [/Sophie/i, /Avios/i].filter((re) => re.test(source));
      if (left.length && !confirm(`This page still mentions ${left.map((re) => re.source).join(" and ")}, from the owner's own trips. Publish it anyway?`)) return;
      content = parts(source, trip.id);
    } catch (err) { return toast(`Can't publish that file: ${err.message}`); } finally { file.value = ""; }
    change(`Published the page for ${trip.title}`, () => db.from("client_trip_pages").upsert({ trip_id: trip.id, ...content }));
  } });
  return el("article", { class: "trip" },
    el("h2", { text: trip.title }),
    el("p", { class: "meta", text: `Made ${new Date(trip.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · ${page ? `page published ${new Date(page.updated_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "no page published yet"}` }),
    el("h3", { text: "Who can open it" }),
    people.length ? el("ul", { class: "people" }, people.map((p) => el("li", null, p.email,
      el("button", { type: "button", "aria-label": `Remove ${p.email}`, text: "×", onclick: () => {
        if (confirm(`Stop ${p.email} opening ${trip.title}?`)) change(`${p.email} can no longer open ${trip.title}`, () => db.from("client_trip_members").delete().eq("trip_id", trip.id).eq("email", p.email));
      } })))) : el("p", { class: "none", text: "Nobody yet. Add the client's email address: the one on their Google account." }),
    el("div", { class: "add" }, email, el("button", { type: "button", class: "small", text: "Add", onclick: add })),
    el("div", { class: "bar" },
      file,
      el("button", { type: "button", class: "small primary", text: page ? "Replace the page" : "Publish the page", onclick: () => file.click() }),
      page && el("a", { class: "small", href: `../trip/?t=${encodeURIComponent(trip.id)}`, text: "Open it" }),
      el("button", { type: "button", class: "small danger push", text: "Delete trip", onclick: () => {
        if (confirm(`Delete ${trip.title}, its page and its list of people? This can't be undone.`)) change(`Deleted ${trip.title}`, () => db.from("client_trips").delete().eq("id", trip.id));
      } })));
}

async function list() {
  const { data: trips, error } = await db.from("client_trips").select("id, title, created_at, client_trip_members(email), client_trip_pages(updated_at)").order("created_at", { ascending: false });
  if (error) { console.error(error); text.textContent = "Couldn't load the trips. Check your connection and reload."; return; }
  text.textContent = `Signed in as ${account.user.email}. A client opens their page at ${new URL("../trip/", location.href).href} after signing in with Google.`;
  const title = el("input", { type: "text", maxlength: 120, placeholder: "e.g. Japan in spring", "aria-label": "Name of the new trip" });
  const make = () => {
    const name = title.value.trim();
    if (!name) return title.focus();
    change(`Made ${name}`, () => db.from("client_trips").insert({ title: name }));
  };
  title.addEventListener("keydown", (e) => { if (e.key === "Enter") make(); });
  body.replaceChildren(
    el("div", { class: "new-trip" }, title, el("button", { type: "button", class: "primary", text: "New client trip", onclick: make })),
    ...(trips.length ? trips.map(tripCard) : [el("p", { class: "none", text: "No client trips yet." })]),
    el("p", { class: "bar" }, el("button", { type: "button", class: "small", text: "Sign out", onclick: async () => { await account.signOut().catch(() => {}); location.reload(); } })));
}

async function start() {
  if (!account || !account.enabled) { text.textContent = "Accounts aren't set up on this site yet. See \"Accounts and sign-in\" in the README."; return; }
  await account.ready;
  if (!account.user) {
    text.textContent = account.problem ? "Sign-in didn't finish. Try again." : "Sign in to manage client trips.";
    body.replaceChildren(el("button", { type: "button", class: "primary", text: "Continue with Google", onclick: (e) => { e.target.disabled = true; account.signIn().catch((err) => { console.error(err); e.target.disabled = false; }); } }));
    return;
  }
  if (!await account.isAdmin()) {
    text.textContent = `${account.user.email} isn't an admin of this site.`;
    body.replaceChildren(el("button", { type: "button", class: "small", text: "Sign out", onclick: async () => { await account.signOut().catch(() => {}); location.reload(); } }));
    return;
  }
  db = await account.db();
  await list();
}

start();
})();
