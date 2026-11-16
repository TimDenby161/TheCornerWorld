// The Corner World: accounts. People sign in with Google, through Supabase, and a signed-in page talks
// straight to the Supabase database. What an account may read and change is decided there, by the rules
// in supabase/migrations/, and never by anything in this file: a browser can be made to send whatever
// its owner likes, so a page can only ever ask.
//
// A page loads this script with the project's address and its publishable key on the tag (written by
// `npm run accounts`, from data/site.json). Both are meant to be public. With neither, accounts are off
// and the site works as it did without them.
//
// Supabase's own library is 220 KB, so it is only fetched when it is needed: when someone presses
// Sign in, comes back from Google, or was signed in on their last visit.
//
// For the pages that use it, this file sets window.tcwAccount:
//   enabled        accounts are set up on this site
//   ready          a promise: settled once it is known whether someone is signed in
//   user           { id, email, name } or null
//   problem        true if a sign-in was started and didn't finish
//   signIn()       goes to Google and comes back to this page
//   signOut()      signs out in this browser
//   remove()       deletes the account and everything kept for it, for good
//   db()           a promise of the Supabase client, for reading and writing as the signed-in user
//   isAdmin()      whether to show the admin screens (the database decides what an admin can do)
//   onChange(fn)   calls fn(user, userBefore) when someone signs in or out, in this tab or another
(function () {
"use strict";

const tag = document.currentScript;
const url = (tag.dataset.url || "").replace(/\/+$/, ""), key = tag.dataset.key || "", lib = tag.dataset.lib || "";
const SESSION = "tcw.auth";   // where the library keeps the session in this browser's storage
const BACK = "tcw.back";      // what was after the page's address when Sign in was pressed
const here = location.origin + location.pathname.replace(/index\.html$/, "");
const listeners = new Set();
let client = null, loading = null, user = null;

const read = (store, name) => { try { return store.getItem(name); } catch { return null; } };
const returning = /[?&](code|error|error_description)=/.test(location.search);

// Google sends people back to the bare address of the page. Whatever followed it when they left (the
// country they were looking at, the trip they were opening) was put aside, and goes back now. Only
// what this site writes there itself is accepted.
let back = "";
if (returning) {
  back = read(sessionStorage, BACK) || "";
  try { sessionStorage.removeItem(BACK); } catch { /* storage blocked */ }
  if (!/^(\?t=[0-9a-f-]{36})?(#[\w=&%.~/-]*)?$/.test(back)) back = "";
  const hash = back.slice(back.indexOf("#") < 0 ? back.length : back.indexOf("#"));
  // The part after the # goes back at once, for the page's own script to read; the code Google sent stays until it has been used
  if (hash && !location.hash) history.replaceState(history.state, "", location.pathname + location.search + hash);
}

function set(session) {
  const u = session && session.user;
  const next = u ? { id: u.id, email: u.email || "", name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "" } : null;
  if ((next && next.id) === (user && user.id)) { user = next; return; }
  const before = user;
  user = next;
  for (const fn of listeners) { try { fn(user, before); } catch (err) { console.error(err); } }
}

function load() {
  if (!account.enabled) return Promise.reject(new Error("Accounts are not set up on this site"));
  return loading || (loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = lib;
    script.onload = () => {
      client = window.supabase.createClient(url, key, {
        // PKCE: Google's answer comes back as a one-use code that only this browser can redeem, rather
        // than as the session itself in the address bar
        auth: { flowType: "pkce", storageKey: SESSION, detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
      });
      // The library must not be called from inside this callback, so the news is passed on a moment later
      client.auth.onAuthStateChange((event, session) => { setTimeout(() => set(session), 0); });
      resolve(client);
    };
    script.onerror = () => { loading = null; reject(new Error("The sign-in code didn't load")); };
    document.head.append(script);
  }));
}

const account = window.tcwAccount = {
  enabled: Boolean(url && key && lib),
  problem: false,
  get user() { return user; },
  db: load,
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  async signIn() {
    const db = await load();
    try { sessionStorage.setItem(BACK, location.search + location.hash); } catch { /* storage blocked: they come back to the plain page */ }
    const { error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: here, queryParams: { prompt: "select_account" } } });
    if (error) throw error;
  },

  async signOut() {
    const db = await load();
    // This browser only: signing out on a borrowed computer shouldn't sign out the phone in your pocket
    await db.auth.signOut({ scope: "local" });
    set(null);
  },

  async remove() {
    const db = await load();
    const { error } = await db.rpc("delete_my_account");
    if (error) throw error;
    await db.auth.signOut({ scope: "local" }).catch(() => {});
    set(null);
  },

  async isAdmin() {
    if (!user) return false;
    const { data, error } = await (await load()).rpc("is_admin");
    return !error && data === true;
  },
};

account.ready = (async () => {
  if (!account.enabled || !(returning || read(localStorage, SESSION) != null)) return;
  try {
    const db = await load();
    // Waits for the library to redeem the code Google sent, if there is one
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    set(data.session);
  } catch (err) {
    console.warn("Sign-in:", err);
  } finally {
    if (returning) {
      // Whatever a sign-in that failed has to say arrives in the address, where anyone could have put
      // it, so the page is told only that there was a problem
      account.problem = !user;
      history.replaceState(history.state, "", location.pathname + (back || location.hash));
    }
  }
})();
})();
