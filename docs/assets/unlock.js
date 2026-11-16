// The Corner World: a client's trip page, locked with a password (made by scripts/lock.mjs).
//
// trip.lock, next to the page, is the trip scrambled with AES-256-GCM under a key made from the
// password (PBKDF2-SHA256). This script asks for the password, makes the key, unscrambles the trip and
// puts it on the screen: its HTML into the page, its styles into the head, its script run from memory.
// A wrong password can't unscramble it: AES-GCM refuses rather than producing nonsense.
//
// Once a password works, it is kept in this browser so the client isn't asked again on this device.
(function () {
"use strict";

const box = document.getElementById("tv"), text = document.getElementById("tv-text"), actions = document.getElementById("tv-actions");
const remembered = `tcw.unlock:${location.pathname.replace(/index\.html$/, "")}`;
const tidy = (value) => value.toLowerCase().replace(/\s+/g, "");
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

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

function recall() { try { return localStorage.getItem(remembered) || ""; } catch { return ""; } }
function remember(password) { try { localStorage.setItem(remembered, password); } catch { /* storage blocked: they'll be asked next time */ } }
function forget() { try { localStorage.removeItem(remembered); } catch { /* nothing kept */ } }

// The trip, unscrambled, or null if the password is wrong
async function unlock(locked, password) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(tidy(password)), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: bytes(locked.salt), iterations: locked.iterations },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(locked.iv) }, key, bytes(locked.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch { return null; }
}

// Puts the trip page on the screen in place of the password box
function show(trip) {
  document.title = `${trip.title} | The Corner World`;
  box.remove();
  document.getElementById("tv-style").remove();
  document.head.append(el("style", { text: trip.css }));
  document.body.insertAdjacentHTML("afterbegin", trip.html);
  const address = URL.createObjectURL(new Blob([trip.js], { type: "text/javascript" }));
  const script = el("script", { src: address });
  script.onload = script.onerror = () => URL.revokeObjectURL(address);
  document.body.append(script);
}

function ask(locked, message) {
  text.textContent = message;
  const input = el("input", { class: "tv-input", type: "text", name: "password", "aria-label": "Password", placeholder: "Password",
    autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "false", enterkeyhint: "go" });
  const button = el("button", { type: "submit", class: "tv-btn tv-main", text: "Open my trip" });
  const form = el("form", { class: "tv-actions", novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const password = input.value;
    if (!tidy(password)) { input.focus(); return; }
    button.disabled = input.disabled = true;
    text.textContent = "Opening…";
    const trip = await unlock(locked, password).catch((err) => { console.error(err); return null; });
    if (trip) { remember(password); show(trip); return; }
    button.disabled = input.disabled = false;
    text.textContent = "That password didn't work. Check it against our email and try again.";
    input.select();
  } }, input, button);
  actions.replaceWith(form);
  input.focus();
}

async function start() {
  if (!window.crypto?.subtle) { text.textContent = "This browser can't open locked pages. Try an up-to-date Safari, Chrome, Firefox or Edge."; return; }
  let locked;
  try {
    const response = await fetch("trip.lock", { cache: "no-cache" });
    if (!response.ok) throw new Error(`trip.lock: ${response.status}`);
    locked = await response.json();
  } catch (err) {
    console.error(err);
    text.textContent = "Your trip page didn't load. Check your connection and try again.";
    actions.replaceChildren(el("button", { type: "button", class: "tv-btn", text: "Try again", onclick: () => location.reload() }));
    return;
  }
  const kept = recall();
  if (kept) {
    text.textContent = "Opening…";
    const trip = await unlock(locked, kept).catch(() => null);
    if (trip) return show(trip);
    forget(); // the page has a new password since this device last opened it
  }
  ask(locked, kept ? "This trip page has a new password. Enter the one from our latest email." : "Enter the password from our email to open your trip page.");
}

start();
})();
