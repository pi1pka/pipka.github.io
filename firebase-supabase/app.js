import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  get,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// CONFIG

const $ = id => document.getElementById(id);

const SITE_URL =
  "https://pi1pka.github.io/pipka.github.io/firebase-supabase/";

const supabase = window.supabase.createClient(
  "https://ttouujjiszknleriaotc.supabase.co",
  "sb_publishable_G9kvkZ7u_e94QVMM7eNlgA_Sgb9-a7p"
);

const firebaseConfig = {
  apiKey: "AIzaSyCj2TRvbdB2v5ny-SMgv7xjKLbJpwpbsis",
  authDomain: "p1pka-11.firebaseapp.com",
  databaseURL:
    "https://p1pka-11-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "p1pka-11",
  storageBucket: "p1pka-11.firebasestorage.app",
  messagingSenderId: "879240289141",
  appId: "1:879240289141:web:2d0d55173aac5909d5913c"
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseDb = getDatabase(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);

const firebaseRecordsRef = ref(firebaseDb, "LabRecords");

// STATE
const state = {
  supabase: {
    user: null,
    role: "user",
    records: [],
    sort: "name",
    ascending: true,
    channel: null
  },
  firebase: {
    user: null,
    role: "user",
    records: [],
    sort: "name",
    ascending: true,
    unsubscribe: null
  }
};

// HELPERS
function showMessage(id, value) {
  $(id).textContent = value || "";
}

function errorMessage(error) {
  return error?.message || String(error);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function shortId(value) {
  if (!value) return "—";
  return value.length > 18
    ? value.slice(0, 18) + "..."
    : value;
}

function setRole(service, role) {
  state[service].role = role;

  const el = $(`${service}Role`);

  el.textContent = role === "admin" ? "Admin" : "User";
  el.classList.toggle("admin", role === "admin");

  renderRecords(service);
}

function getSortedRecords(service) {
  const current = state[service];

  return [...current.records].sort((a, b) => {
    let comparison = 0;

    if (current.sort === "name") {
      comparison = (a.name || "").localeCompare(
        b.name || "",
        "ru",
        { sensitivity: "base", numeric: true }
      );
    } else {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();

      comparison = aTime - bTime;
    }

    return current.ascending ? comparison : -comparison;
  });
}

// TABLE RENDER
function renderRecords(service) {
  const tbody = $(`${service}Rows`);
  const records = getSortedRecords(service);
  const isAdmin = state[service].role === "admin";

  tbody.replaceChildren();

  $(`${service}Count`).textContent =
    `${records.length} записей`;

  if (!records.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = 3;
    td.className = "empty-row";
    td.textContent = "Записей пока нет";

    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  records.forEach(record => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = record.name || "Без имени";

    const dateTd = document.createElement("td");
    dateTd.textContent = formatDate(record.created_at);

    const actionsTd = document.createElement("td");

    if (isAdmin) {
      const deleteBtn = document.createElement("button");

      deleteBtn.type = "button";
      deleteBtn.className = "delete-button";
      deleteBtn.textContent = "Удалить";

      deleteBtn.onclick = () =>
        deleteRecord(service, record.id);

      actionsTd.appendChild(deleteBtn);
    } else {
      actionsTd.textContent = "—";
    }

    tr.append(nameTd, dateTd, actionsTd);
    tbody.appendChild(tr);
  });
}

function configureSort(service) {
  function changeSort(column) {
    const current = state[service];

    if (current.sort === column) {
      current.ascending = !current.ascending;
    } else {
      current.sort = column;
      current.ascending = true;
    }

    updateSortLabels(service);
    renderRecords(service);
  }

  $(`${service}SortName`).onclick = () => changeSort("name");
  $(`${service}SortDate`).onclick = () => changeSort("date");

  updateSortLabels(service);
}

function updateSortLabels(service) {
  const current = state[service];

  const arrow = current.ascending ? "↑" : "↓";

  $(`${service}SortName`).textContent =
    "Имя " + (current.sort === "name" ? arrow : "↕");

  $(`${service}SortDate`).textContent =
    "Дата " + (current.sort === "date" ? arrow : "↕");
}

configureSort("supabase");
configureSort("firebase");

// NAVIGATION
const pages = {
  supabase: {
    section: "supabaseSection",
    button: "navSupabase",
    title: "Supabase",
    subtitle: "Авторизация и управление данными"
  },
  firebase: {
    section: "firebaseSection",
    button: "navFirebase",
    title: "Firebase",
    subtitle: "Authentication & Realtime Database"
  },
  about: {
    section: "aboutSection",
    button: "navAbout",
    title: "О проекте",
    subtitle: "Возможности и исследование"
  }
};

function openPage(name) {
  for (const [key, page] of Object.entries(pages)) {
    $(page.section).hidden = key !== name;

    $(page.button).classList.toggle(
      "active",
      key === name
    );
  }

  $("pageTitle").textContent = pages[name].title;
  $("pageSubtitle").textContent = pages[name].subtitle;
}

$("navSupabase").onclick = () => openPage("supabase");
$("navFirebase").onclick = () => openPage("firebase");
$("navAbout").onclick = () => openPage("about");

openPage("supabase");

// SUPABASE AUTH
async function signInSupabase(provider) {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: SITE_URL
      }
    });

    if (error) throw error;
  } catch (error) {
    showMessage(
      "supabaseAuthMessage",
      errorMessage(error)
    );
  }
}

$("supabaseGoogle").onclick =
  () => signInSupabase("google");

$("supabaseGithub").onclick =
  () => signInSupabase("github");

$("supabaseLogout").onclick = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  } catch (error) {
    showMessage(
      "supabaseAuthMessage",
      errorMessage(error)
    );
  }
};

// SUPABASE ROLE
async function loadSupabaseRole(userId) {
  const { data, error } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  // Новому пользователю назначается роль user.
  if (!data) {
    const { error: insertError } = await supabase
      .from("app_roles")
      .insert({
        user_id: userId,
        role: "user"
      });

    // На случай одновременного создания записи.
    if (insertError && insertError.code !== "23505") {
      throw insertError;
    }

    const { data: fresh, error: readError } = await supabase
      .from("app_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (readError) throw readError;

    return fresh.role;
  }

  return data.role;
}

// SUPABASE PROFILE
let supabaseSessionCounter = 0;

async function refreshSupabaseUser() {
  const requestId = ++supabaseSessionCounter;

  try {
    const { data: { user }, error } =
      await supabase.auth.getUser();

    if (error && !user) {
      console.warn(error.message);
    }

    if (requestId !== supabaseSessionCounter) return;

    state.supabase.user = user || null;

    $("supabaseLogin").hidden = !!user;
    $("supabaseProfile").hidden = !user;
    $("supabaseData").hidden = !user;

    if (!user) {
      setRole("supabase", "user");
      state.supabase.records = [];
      renderRecords("supabase");

      if (state.supabase.channel) {
        await supabase.removeChannel(state.supabase.channel);
        state.supabase.channel = null;
      }

      showMessage("supabaseAuthMessage", "");
      return;
    }

    const name =
      user.user_metadata?.user_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Пользователь";

    $("supabaseName").textContent = name;
    $("supabaseEmail").textContent = user.email || "—";
    $("supabaseAvatar").textContent =
      name.charAt(0).toUpperCase();

    $("supabaseCreated").textContent =
      formatDate(user.created_at);

    $("supabaseLastLogin").textContent =
      formatDate(user.last_sign_in_at);

    $("supabaseUid").textContent = shortId(user.id);
    $("supabaseUid").title = user.id;

    const role = await loadSupabaseRole(user.id);

    if (requestId !== supabaseSessionCounter) return;

    setRole("supabase", role);

    await loadSupabaseRecords();

    if (requestId !== supabaseSessionCounter) return;

    startSupabaseRealtime();

    showMessage(
      "supabaseAuthMessage",
      "Авторизация выполнена"
    );

  } catch (error) {
    showMessage(
      "supabaseAuthMessage",
      errorMessage(error)
    );
  }
}

// SUPABASE DATA
async function loadSupabaseRecords() {
  const { data, error } = await supabase
    .from("LabRecords")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showMessage("supabaseDbMessage", errorMessage(error));
    throw error;
  }

  state.supabase.records = data || [];
  renderRecords("supabase");

  showMessage("supabaseDbMessage", "");
}

$("supabaseForm").onsubmit = async event => {
  event.preventDefault();

  const user = state.supabase.user;
  const name = $("supabaseInput").value.trim();

  if (!user || !name) return;

  try {
    const { error } = await supabase
      .from("LabRecords")
      .insert({
        name,
        owner_uid: user.id
      });

    if (error) throw error;

    $("supabaseForm").reset();

    await loadSupabaseRecords();

    showMessage(
      "supabaseDbMessage",
      "Запись успешно добавлена"
    );

  } catch (error) {
    showMessage(
      "supabaseDbMessage",
      errorMessage(error)
    );
  }
};

// SUPABASE REALTIME
function startSupabaseRealtime() {
  if (state.supabase.channel) return;

  state.supabase.channel = supabase
    .channel("authspace-lab-records")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "LabRecords"
    }, () => {
      if (state.supabase.user) {
        loadSupabaseRecords().catch(console.error);
      }
    })
    .subscribe();
}

// FIREBASE AUTH
async function signInFirebase(provider) {
  try {
    showMessage(
      "firebaseAuthMessage",
      "Открываем окно авторизации..."
    );

    await signInWithPopup(firebaseAuth, provider);

  } catch (error) {
    if (error.code ===
        "auth/account-exists-with-different-credential") {
      showMessage(
        "firebaseAuthMessage",
        "Такая почта уже используется. " +
        "Войдите через Google, затем привяжите GitHub " +
        "в профиле."
      );
      return;
    }

    showMessage(
      "firebaseAuthMessage",
      errorMessage(error)
    );
  }
}

$("firebaseGoogle").onclick = () =>
  signInFirebase(new GoogleAuthProvider());

$("firebaseGithub").onclick = () =>
  signInFirebase(new GithubAuthProvider());

$("firebaseLogout").onclick = async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    showMessage(
      "firebaseAuthMessage",
      errorMessage(error)
    );
  }
};

// FIREBASE GITHUB LINK
function updateFirebaseProviders(user) {
  const providers = user.providerData.map(
    p => p.providerId
  );

  const hasGitHub = providers.includes("github.com");
  const hasGoogle = providers.includes("google.com");

  $("firebaseLinkBox").hidden = hasGitHub;

  const names = [];

  if (hasGoogle) names.push("Google");
  if (hasGitHub) names.push("GitHub");

  $("firebaseProviders").textContent =
    "Подключено: " + (names.join(", ") || "—");
}

$("firebaseLinkGithub").onclick = async () => {
  const user = firebaseAuth.currentUser;

  if (!user) return;

  try {
    const result = await linkWithPopup(
      user,
      new GithubAuthProvider()
    );

    updateFirebaseProviders(result.user);

    showMessage(
      "firebaseAuthMessage",
      "GitHub успешно привязан!"
    );

  } catch (error) {
    showMessage(
      "firebaseAuthMessage",
      errorMessage(error)
    );
  }
};

// FIREBASE ROLE
async function loadFirebaseRole(uid) {
  const snapshot = await get(
    ref(firebaseDb, `adminUids/${uid}`)
  );

  return snapshot.val() === true ? "admin" : "user";
}

// FIREBASE PROFILE + AUTH STATE
let firebaseSessionCounter = 0;

onAuthStateChanged(firebaseAuth, async user => {
  const requestId = ++firebaseSessionCounter;

  if (state.firebase.unsubscribe) {
    state.firebase.unsubscribe();
    state.firebase.unsubscribe = null;
  }

  state.firebase.user = user || null;

  $("firebaseLogin").hidden = !!user;
  $("firebaseProfile").hidden = !user;
  $("firebaseData").hidden = !user;

  if (!user) {
    state.firebase.records = [];
    setRole("firebase", "user");
    renderRecords("firebase");

    showMessage("firebaseAuthMessage", "");
    return;
  }

  const name =
    user.displayName ||
    user.email ||
    "Пользователь";

  $("firebaseName").textContent = name;
  $("firebaseEmail").textContent = user.email || "—";
  $("firebaseAvatar").textContent =
    name.charAt(0).toUpperCase();

  $("firebaseCreated").textContent =
    formatDate(user.metadata.creationTime);

  $("firebaseLastLogin").textContent =
    formatDate(user.metadata.lastSignInTime);

  $("firebaseUid").textContent = shortId(user.uid);
  $("firebaseUid").title = user.uid;

  updateFirebaseProviders(user);

  try {
    const role = await loadFirebaseRole(user.uid);

    if (requestId !== firebaseSessionCounter) return;

    setRole("firebase", role);
    startFirebaseRealtime();

    showMessage(
      "firebaseAuthMessage",
      "Авторизация выполнена"
    );
  } catch (error) {
    showMessage(
      "firebaseAuthMessage",
      errorMessage(error)
    );
  }

}, error => {
  showMessage(
    "firebaseAuthMessage",
    errorMessage(error)
  );
});

// FIREBASE REALTIME DATA
function startFirebaseRealtime() {
  if (state.firebase.unsubscribe) {
    state.firebase.unsubscribe();
  }

  state.firebase.unsubscribe = onValue(
    firebaseRecordsRef,
    snapshot => {
      const records = [];

      snapshot.forEach(child => {
        const value = child.val();

        records.push({
          id: child.key,
          name: value.name,
          created_at: value.created_at
        });
      });

      state.firebase.records = records;
      renderRecords("firebase");

      showMessage("firebaseDbMessage", "");
    },
    error => {
      showMessage(
        "firebaseDbMessage",
        errorMessage(error)
      );
    }
  );
}

// FIREBASE INSERT
$("firebaseForm").onsubmit = async event => {
  event.preventDefault();

  const user = firebaseAuth.currentUser;
  const name = $("firebaseInput").value.trim();

  if (!user || !name) return;

  try {
    await push(firebaseRecordsRef, {
      name,
      created_at: new Date().toISOString(),
      owner_uid: user.uid
    });

    $("firebaseForm").reset();

    showMessage(
      "firebaseDbMessage",
      "Запись успешно добавлена"
    );

  } catch (error) {
    showMessage(
      "firebaseDbMessage",
      errorMessage(error)
    );
  }
};

// DELETE: ADMIN ONLY
async function deleteRecord(service, id) {
  const current = state[service];

  if (!current.user || current.role !== "admin") {
    showMessage(
      `${service}DbMessage`,
      "Удаление доступно только администратору"
    );
    return;
  }

  const confirmed = window.confirm(
    "Удалить выбранную запись?"
  );

  if (!confirmed) return;

  try {
    if (service === "supabase") {
      const { error } = await supabase
        .from("LabRecords")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadSupabaseRecords();
    } else {
      await remove(
        ref(firebaseDb, `LabRecords/${id}`)
      );
    }

    showMessage(
      `${service}DbMessage`,
      "Запись удалена"
    );
  } catch (error) {
    showMessage(
      `${service}DbMessage`,
      errorMessage(error)
    );
  }
}

// INITIAL AUTH CHECK
supabase.auth.onAuthStateChange(() => {
  setTimeout(() => {
    refreshSupabaseUser();
  }, 0);
});

refreshSupabaseUser();

console.log("Authspace initialized");
