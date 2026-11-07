
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getDatabase, ref, push, get, onValue, remove
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

import {
  getAuth, GoogleAuthProvider, GithubAuthProvider,
  signInWithPopup, linkWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// НАСТРОЙКИ

const $ = id => document.getElementById(id);

const SITE_URL =
  "https://pi1pka.github.io/pipka.github.io/firebase-supabase/";

const supabase = window.supabase.createClient(
  "https://ttouujjiszknleriaotc.supabase.co",
  "sb_publishable_G9kvkZ7u_e94QVMM7eNlgA_Sgb9-a7p"
);

const firebaseApp = initializeApp({
  apiKey: "AIzaSyCj2TRvbdB2v5ny-SMgv7xjKLbJpwpbsis",
  authDomain: "p1pka-11.firebaseapp.com",
  databaseURL:
    "https://p1pka-11-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "p1pka-11",
  storageBucket: "p1pka-11.firebasestorage.app",
  messagingSenderId: "879240289141",
  appId: "1:879240289141:web:2d0d55173aac5909d5913c"
});

const fbAuth = getAuth(firebaseApp);
const fbDb = getDatabase(firebaseApp);
const fbUsers = ref(fbDb, "Users");

// СОСТОЯНИЕ

const state = {
  supabase: {
    user: null,
    role: "user",
    rows: [],
    sort: "username",
    asc: true
  },
  firebase: {
    user: null,
    role: "user",
    rows: [],
    sort: "username",
    asc: true
  }
};

let supabaseChannel = null;
let firebaseUnsubscribe = null;
let supabaseRequest = 0;
let firebaseRequest = 0;

// ОБЩИЕ ФУНКЦИИ

const message = (id, text = "") => {
  $(id).textContent = text;
};

const errorText = error =>
  error?.message || String(error);

function dateText(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("ru-RU");
}

function setRole(service, role) {
  const value = role === "admin" ? "admin" : "user";

  state[service].role = value;

  const badge = $(`${service}Role`);
  badge.textContent = value === "admin" ? "Admin" : "User";
  badge.classList.toggle("admin", value === "admin");

  renderTable(service);
}

function showProfile(service, user, name, email, created, last) {
  $(`${service}Login`).hidden = !!user;
  $(`${service}Profile`).hidden = !user;
  $(`${service}Data`).hidden = !user;

  if (!user) {
    state[service].rows = [];
    setRole(service, "user");
    return;
  }

  $(`${service}Name`).textContent = name;
  $(`${service}Email`).textContent = email || "—";
  $(`${service}Avatar`).textContent =
    name.charAt(0).toUpperCase();

  $(`${service}Created`).textContent = dateText(created);
  $(`${service}LastLogin`).textContent = dateText(last);
}

// НАВИГАЦИЯ

function showPage(service) {
  $("supabaseSection").hidden = service !== "supabase";
  $("firebaseSection").hidden = service !== "firebase";

  $("navSupabase").classList.toggle(
    "active", service === "supabase"
  );

  $("navFirebase").classList.toggle(
    "active", service === "firebase"
  );

  $("pageTitle").textContent =
    service === "supabase" ? "Supabase" : "Firebase";
}

$("navSupabase").onclick = () => showPage("supabase");
$("navFirebase").onclick = () => showPage("firebase");

showPage("supabase");

// СОРТИРОВКА И ТАБЛИЦА

function renderTable(service) {
  const s = state[service];
  const tbody = $(`${service}Rows`);

  const rows = [...s.rows].sort((a, b) => {
    let result;

    if (s.sort === "created_at") {
      const x = new Date(a.created_at || 0).getTime();
      const y = new Date(b.created_at || 0).getTime();
      result = x - y;
    } else {
      result = String(a[s.sort] || "").localeCompare(
        String(b[s.sort] || ""),
        "ru",
        { numeric: true, sensitivity: "base" }
      );
    }

    return s.asc ? result : -result;
  });

  tbody.replaceChildren();

  $(`${service}Count`).textContent =
    `${rows.length} записей`;

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "empty-row";
    td.textContent = "Записей пока нет";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const user of rows) {
    const tr = document.createElement("tr");

    const cell = text => {
      const td = document.createElement("td");
      td.textContent = text;
      return td;
    };

    const username = cell(user.username || "—");
    const password = cell("••••••");
    password.className = "masked-password";

    const roleCell = document.createElement("td");
    const roleBadge = document.createElement("span");

    roleBadge.className =
      user.role === "admin" ? "role admin" : "role";

    roleBadge.textContent =
      user.role === "admin" ? "Admin" : "User";

    roleCell.appendChild(roleBadge);

    const created = cell(dateText(user.created_at));
    const actions = document.createElement("td");

    if (s.role === "admin") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "delete-button";
      button.textContent = "Удалить";

      button.onclick = () => deleteUser(service, user.id);

      actions.appendChild(button);
    } else {
      actions.textContent = "—";
    }

    tr.append(username, password, roleCell, created, actions);
    tbody.appendChild(tr);
  }
}

function setupSort(service) {
  const columns = {
    Name: ["username", "Логин"],
    Role: ["role", "Роль"],
    Date: ["created_at", "Дата"]
  };

  const updateLabels = () => {
    for (const [suffix, [field, title]] of
      Object.entries(columns)) {

      const s = state[service];

      $(`${service}Sort${suffix}`).textContent =
        title + " " + (
          s.sort === field
            ? s.asc ? "↑" : "↓"
            : "↕"
        );
    }
  };

  for (const [suffix, [field]] of Object.entries(columns)) {
    $(`${service}Sort${suffix}`).onclick = () => {
      const s = state[service];

      s.asc = s.sort === field ? !s.asc : true;
      s.sort = field;

      updateLabels();
      renderTable(service);
    };
  }

  updateLabels();
}

setupSort("supabase");
setupSort("firebase");

// SUPABASE AUTH

async function loginSupabase(provider) {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: SITE_URL }
    });

    if (error) throw error;
  } catch (error) {
    message("supabaseAuthMessage", errorText(error));
  }
}

$("supabaseGoogle").onclick = () => loginSupabase("google");
$("supabaseGithub").onclick = () => loginSupabase("github");

$("supabaseLogout").onclick = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    message("supabaseAuthMessage", errorText(error));
  }
};

// SUPABASE ROLE

async function getSupabaseRole(uid) {
  const read = async () => {
    const { data, error } = await supabase
      .from("app_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) throw error;
    return data?.role;
  };

  const existing = await read();

  if (existing) return existing;

  const { error } = await supabase
    .from("app_roles")
    .insert({ user_id: uid, role: "user" });

  if (error && error.code !== "23505") throw error;

  return (await read()) || "user";
}

// SUPABASE DATABASE

async function loadSupabaseUsers() {
  const { data, error } = await supabase
    .from("Users")
    .select("record_id,username,role,created_at");

  if (error) {
    message("supabaseDbMessage", errorText(error));
    return;
  }

  state.supabase.rows = (data || []).map(row => ({
    id: row.record_id,
    username: row.username,
    role: row.role || "user",
    created_at: row.created_at
  }));

  renderTable("supabase");
  message("supabaseDbMessage");
}

$("supabaseForm").onsubmit = async event => {
  event.preventDefault();

  if (!state.supabase.user) return;

  const username = $("supabaseUsername").value.trim();
  const password = $("supabasePassword").value;

  if (!username || !password) return;

  try {
    const { error } = await supabase
      .from("Users")
      .insert({ username, password, role: "user" });

    if (error) throw error;

    $("supabaseForm").reset();
    await loadSupabaseUsers();

    message("supabaseDbMessage", "Пользователь добавлен");
  } catch (error) {
    message("supabaseDbMessage", errorText(error));
  }
};

function startSupabaseRealtime() {
  if (supabaseChannel) return;

  supabaseChannel = supabase
    .channel("authspace-users")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "Users"
    }, () => {
      if (state.supabase.user) loadSupabaseUsers();
    })
    .subscribe();
}

async function refreshSupabase() {
  const request = ++supabaseRequest;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (request !== supabaseRequest) return;

    state.supabase.user = user || null;

    if (!user) {
      showProfile("supabase", null);

      if (supabaseChannel) {
        const channel = supabaseChannel;
        supabaseChannel = null;
        await supabase.removeChannel(channel);
      }

      message("supabaseAuthMessage");
      return;
    }

    const name =
      user.user_metadata?.user_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Пользователь";

    showProfile(
      "supabase",
      user,
      name,
      user.email,
      user.created_at,
      user.last_sign_in_at
    );

    const role = await getSupabaseRole(user.id);
    if (request !== supabaseRequest) return;

    setRole("supabase", role);
    await loadSupabaseUsers();

    if (request !== supabaseRequest) return;

    startSupabaseRealtime();
    message("supabaseAuthMessage", "Вход выполнен");

  } catch (error) {
    message("supabaseAuthMessage", errorText(error));
  }
}

supabase.auth.onAuthStateChange(() => {
  setTimeout(refreshSupabase, 0);
});

refreshSupabase();

// FIREBASE AUTH

async function loginFirebase(provider) {
  try {
    message("firebaseAuthMessage");
    await signInWithPopup(fbAuth, provider);
  } catch (error) {
    const text = error.code ===
      "auth/account-exists-with-different-credential"
        ? "Аккаунт с таким email уже существует. " +
          "Войдите через Google и привяжите GitHub."
        : errorText(error);

    message("firebaseAuthMessage", text);
  }
}

$("firebaseGoogle").onclick =
  () => loginFirebase(new GoogleAuthProvider());

$("firebaseGithub").onclick =
  () => loginFirebase(new GithubAuthProvider());

$("firebaseLogout").onclick = async () => {
  try {
    await signOut(fbAuth);
  } catch (error) {
    message("firebaseAuthMessage", errorText(error));
  }
};

$("firebaseLinkGithub").onclick = async () => {
  if (!fbAuth.currentUser) return;

  try {
    const result = await linkWithPopup(
      fbAuth.currentUser,
      new GithubAuthProvider()
    );

    updateFirebaseProviders(result.user);
    message("firebaseAuthMessage", "GitHub привязан");
  } catch (error) {
    message("firebaseAuthMessage", errorText(error));
  }
};

function updateFirebaseProviders(user) {
  $("firebaseLinkBox").hidden = user.providerData.some(
    p => p.providerId === "github.com"
  );
}

// FIREBASE ROLE

async function getFirebaseRole(uid) {
  const snapshot = await get(ref(fbDb, `adminUids/${uid}`));

  return snapshot.val() === true ? "admin" : "user";
}

// FIREBASE REALTIME

function startFirebaseRealtime() {
  if (firebaseUnsubscribe) firebaseUnsubscribe();

  firebaseUnsubscribe = onValue(
    fbUsers,
    snapshot => {
      const rows = [];

      snapshot.forEach(child => {
        const data = child.val() || {};

        rows.push({
          id: child.key,
          username: data.username || "",
          role: data.role || "user",
          created_at: data.created_at || null
        });
      });

      state.firebase.rows = rows;
      renderTable("firebase");
      message("firebaseDbMessage");
    },
    error => message("firebaseDbMessage", errorText(error))
  );
}

// FIREBASE INSERT

$("firebaseForm").onsubmit = async event => {
  event.preventDefault();

  if (!fbAuth.currentUser) return;

  const username = $("firebaseUsername").value.trim();
  const password = $("firebasePassword").value;

  if (!username || !password) return;

  try {
    await push(fbUsers, {
      username,
      password,
      role: "user",
      created_at: new Date().toISOString()
    });

    $("firebaseForm").reset();
    message("firebaseDbMessage", "Пользователь добавлен");
  } catch (error) {
    message("firebaseDbMessage", errorText(error));
  }
};

// FIREBASE PROFILE

onAuthStateChanged(fbAuth, async user => {
  const request = ++firebaseRequest;

  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
    firebaseUnsubscribe = null;
  }

  state.firebase.user = user || null;

  if (!user) {
    showProfile("firebase", null);
    message("firebaseAuthMessage");
    return;
  }

  const name = user.displayName || user.email || "Пользователь";

  showProfile(
    "firebase",
    user,
    name,
    user.email,
    user.metadata.creationTime,
    user.metadata.lastSignInTime
  );

  updateFirebaseProviders(user);

  try {
    const role = await getFirebaseRole(user.uid);
    if (request !== firebaseRequest) return;

    setRole("firebase", role);
    startFirebaseRealtime();

    message("firebaseAuthMessage", "Вход выполнен");
  } catch (error) {
    message("firebaseAuthMessage", errorText(error));
  }
});

// УДАЛЕНИЕ

async function deleteUser(service, id) {
  if (!state[service].user ||
      state[service].role !== "admin") {
    message(`${service}DbMessage`, "Недостаточно прав");
    return;
  }

  if (!confirm("Удалить пользователя?")) return;

  try {
    if (service === "supabase") {
      const { error } = await supabase
        .from("Users")
        .delete()
        .eq("record_id", id);

      if (error) throw error;

      await loadSupabaseUsers();
    } else {
      await remove(ref(fbDb, `Users/${id}`));
    }

    message(`${service}DbMessage`, "Запись удалена");
  } catch (error) {
    message(`${service}DbMessage`, errorText(error));
  }
}

console.log("Firebase & Supabase initialized");
