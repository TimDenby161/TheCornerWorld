// The Corner World: trip/, where a client opens the trip page made for them.
//
// The page is not a file on the site. It is kept in the database (client_trip_pages), which hands it
// only to an account whose email address is on that trip's list (the rules are in supabase/migrations/).
// So this script signs the client in, asks the database which trips they may see, and puts the one they
// choose on the screen: its HTML into the page, its styles into the head, its script run from memory.
//
// The trip page's script runs here as part of the site, so it is trusted as the site's own code is. That
// is sound because only an admin can put a page in the database, just as only the owner can change the
// files on the site.
(function () {
"use strict";

const account = window.tcwAccount;
const box = document.getElementById("tv"), title = document.getElementById("tv-title"), text = document.getElementById("tv-text"), actions = document.getElementById("tv-actions");

function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...kids.filter(Boolean));
  return node;
}

function say(heading, message, ...buttons) {
  title.textContent = heading;
  text.textContent = message;
  actions.replaceChildren(...buttons.filter(Boolean));
}

const signOut = (label) => el("button", { type: "button", class: "tv-link", text: label, onclick: async () => { await account.signOut().catch(() => {}); location.replace(location.pathname); } });

function askToSignIn(problem) {
  say("Your trip page", problem ? "Sign-in didn't finish. Try again." : "Sign in to open the trip page we made for you. Use the Google account for the email address you gave us.",
    el("button", { type: "button", class: "tv-btn tv-main", text: "Continue with Google", onclick: async (e) => {
      e.target.disabled = true;
      try { await account.signIn(); } catch (err) { console.error(err); e.target.disabled = false; text.textContent = "Couldn't start sign-in. Check your connection and try again."; }
    } }),
    el("a", { class: "tv-link", href: "../privacy/", text: "What we keep and why" }));
}

// Puts a trip page on the screen in place of everything this script was showing
function show(trip, page) {
  document.title = `${trip.title} | The Corner World`;
  box.remove();
  document.getElementById("tv-style").remove();
  document.head.append(el("style", { text: page.css }));
  // The page's own markup. Any script in it would not run: the security policy allows none written into a page.
  document.body.insertAdjacentHTML("afterbegin", page.html);
  const foot = el("p", { style: "margin:0;padding:18px 16px calc(env(safe-area-inset-bottom) + 18px);text-align:center;font:13px/1.4 system-ui,sans-serif;opacity:.7" },
    `Signed in as ${account.user.email} · `, signOutLink(), " · ", el("a", { href: "../", style: "color:inherit", text: "The Corner World" }));
  document.body.append(foot);
  const address = URL.createObjectURL(new Blob([page.js], { type: "text/javascript" }));
  const script = el("script", { src: address });
  script.onload = script.onerror = () => URL.revokeObjectURL(address);
  document.body.append(script);
}
function signOutLink() {
  return el("a", { href: "#", style: "color:inherit", text: "Sign out", onclick: async (e) => { e.preventDefault(); await account.signOut().catch(() => {}); location.replace(location.pathname); } });
}

async function open(db, trip) {
  say(trip.title, "Opening…");
  const { data: page, error } = await db.from("client_trip_pages").select("html, css, js").eq("trip_id", trip.id).maybeSingle();
  if (error) throw error;
  if (!page) return say(trip.title, "This trip page isn't ready yet. We'll email you when it is.", signOut("Sign out"));
  show(trip, page);
}

async function start() {
  if (!account || !account.enabled) return say("Your trip page", "Trip pages open here once sign-in is switched on. If you're waiting for yours, we'll email you.");
  await account.ready;
  if (!account.user) return askToSignIn(account.problem);
  try {
    const db = await account.db();
    // Asks for every client trip; the database returns only the ones this account may see
    const { data: trips, error } = await db.from("client_trips").select("id, title").order("created_at", { ascending: false });
    if (error) throw error;
    const wanted = new URLSearchParams(location.search).get("t");
    const trip = trips.find((t) => t.id === wanted) || (trips.length === 1 ? trips[0] : null);
    if (trip) return await open(db, trip);
    if (!trips.length) {
      return say("No trip page yet", `There's no trip page for ${account.user.email}. If we've made you one, it's under the email address you gave us: sign in with that Google account instead.`,
        el("button", { type: "button", class: "tv-btn tv-main", text: "Use a different account", onclick: async () => { await account.signOut().catch(() => {}); await account.signIn(); } }),
        signOut("Sign out"));
    }
    say("Your trips", "Choose a trip to open.", ...trips.map((t) => el("a", { class: "tv-pick", href: `?t=${encodeURIComponent(t.id)}`, text: t.title })), signOut("Sign out"));
  } catch (err) {
    console.error(err);
    say("Couldn't open your trip", "Check your connection and try again.", el("button", { type: "button", class: "tv-btn", text: "Try again", onclick: () => location.reload() }), signOut("Sign out"));
  }
}

start();
})();
