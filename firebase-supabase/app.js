
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getDatabase, ref, push, get, onValue
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// НАСТРОЙКИ

const $ = id => document.getElementById(id);

const redirectUrl =
  "https://pi1pka.github.io/pipka.github.io/firebase-supabase/";

const client = window.supabase.createClient(
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const usersRef = ref(db, "Users");

const firebaseAuth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

function showMessage(id, text) {
  $(id).textContent = text;
}

function showUsers(id, users) {
  const list = $(id);
  list.replaceChildren();

  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user.username || "Без имени";
    list.appendChild(li);
  });
}

// ГЛАВНЫЕ ВКЛАДКИ

function openTab(tab) {
  const isAuth = tab === "auth";

  $("databaseSection").hidden = isAuth;
  $("authSwitcher").hidden = !isAuth;

  if (isAuth) {
    $("authSection").hidden = currentAuth !== "supabase";
    $("firebaseAuthSection").hidden = currentAuth !== "firebase";
  } else {
    $("authSection").hidden = true;
    $("firebaseAuthSection").hidden = true;
  }

  $("authTab").classList.toggle("active", isAuth);
  $("databaseTab").classList.toggle("active", !isAuth);
}

$("authTab").onclick = () => openTab("auth");
$("databaseTab").onclick = () => openTab("database");

// ПЕРЕКЛЮЧЕНИЕ SUPABASE / FIREBASE

let currentAuth = "supabase";

function switchAuth(service) {
  currentAuth = service;

  $("authSection").hidden = service !== "supabase";
  $("firebaseAuthSection").hidden = service !== "firebase";

  $("showSupabaseAuth").classList.toggle(
    "active", service === "supabase"
  );

  $("showFirebaseAuth").classList.toggle(
    "active", service === "firebase"
  );
}

$("showSupabaseAuth").onclick = () => switchAuth("supabase");
$("showFirebaseAuth").onclick = () => switchAuth("firebase");

switchAuth("supabase");
openTab("auth");

// SUPABASE SELECT

async function loadSupabase(id, messageId) {
  const { data, error } = await client
    .from("Users")
    .select("username");

  if (error) {
    if (messageId) showMessage(messageId, error.message);
    return;
  }

  showUsers(id, data || []);
}

async function loadUsers() {
  await loadSupabase("usersList", "message");
}

// SUPABASE INSERT

$("userForm").onsubmit = async event => {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  if (!username || !password) return;

  const { error } = await client
    .from("Users")
    .insert({ username, password });

  if (error) {
    showMessage("message", error.message);
    return;
  }

  $("userForm").reset();
  await loadUsers();

  showMessage("message", "Пользователь добавлен!");
};

// SUPABASE REALTIME

async function loadRealtimeUsers() {
  await loadSupabase(
    "supabaseRealtimeList",
    "supabaseRealtimeMessage"
  );
}

client
  .channel("users-changes")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "Users"
  }, () => {
    loadRealtimeUsers();
  })
  .subscribe(status => {
    showMessage(
      "supabaseRealtimeMessage",
      "Realtime: " + status
    );
  });

// SUPABASE OAUTH

async function loginSupabase(provider) {
  showMessage("authMessage", "Переход к авторизации...");

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) throw error;
  } catch (error) {
    showMessage("authMessage", error.message);
  }
}

$("githubLogin").onclick = () => loginSupabase("github");
$("googleLogin").onclick = () => loginSupabase("google");

// ПРОФИЛЬ SUPABASE

async function updateSupabaseProfile() {
  try {
    const { data: { user }, error } =
      await client.auth.getUser();

    if (error || !user) {
      $("authButtons").hidden = false;
      $("authProfile").hidden = true;
      $("authUsersList").replaceChildren();
      return;
    }

    $("authButtons").hidden = true;
    $("authProfile").hidden = false;

    $("authUsername").textContent =
      user.user_metadata?.user_name ||
      user.user_metadata?.full_name ||
      user.email ||
      "Пользователь";

    await loadSupabase("authUsersList", "authMessage");

  } catch (error) {
    showMessage("authMessage", error.message);
  }
}

// ВЫХОД ИЗ SUPABASE

$("logoutBtn").onclick = async () => {
  const { error } = await client.auth.signOut();

  if (error) {
    showMessage("authMessage", error.message);
    return;
  }

  showMessage("authMessage", "");
  await updateSupabaseProfile();
};

client.auth.onAuthStateChange(() => {
  setTimeout(updateSupabaseProfile, 0);
});

// FIREBASE SELECT

async function loadFirebaseUsers() {
  try {
    const snapshot = await get(usersRef);

    const users = snapshot.exists()
      ? Object.values(snapshot.val())
      : [];

    showUsers("firebaseUsersList", users);
    showMessage("firebaseMessage", "Данные загружены!");

  } catch (error) {
    showMessage("firebaseMessage", error.message);
  }
}

$("firebaseSelect").onclick = loadFirebaseUsers;

// FIREBASE INSERT

$("firebaseForm").onsubmit = async event => {
  event.preventDefault();

  const username = $("firebaseUsername").value.trim();
  const password = $("firebasePassword").value;

  if (!username || !password) return;

  try {
    await push(usersRef, { username, password });

    $("firebaseForm").reset();
    showMessage("firebaseMessage", "Пользователь добавлен!");

  } catch (error) {
    showMessage("firebaseMessage", error.message);
  }
};

// FIREBASE REALTIME

onValue(usersRef, snapshot => {
  const users = snapshot.exists()
    ? Object.values(snapshot.val())
    : [];

  showUsers("firebaseRealtimeList", users);

  showMessage(
    "firebaseRealtimeMessage",
    "Realtime активен"
  );

}, error => {
  showMessage(
    "firebaseRealtimeMessage",
    error.message
  );
});

// FIREBASE GOOGLE AUTH

$("firebaseGoogleLogin").onclick = async () => {
  showMessage(
    "firebaseAuthMessage",
    "Открываем Google..."
  );

  try {
    await signInWithPopup(firebaseAuth, googleProvider);
  } catch (error) {
    showMessage("firebaseAuthMessage", error.message);
  }
};

// FIREBASE ПРОФИЛЬ

onAuthStateChanged(firebaseAuth, async user => {
  $("firebaseAuthButtons").hidden = !!user;
  $("firebaseAuthProfile").hidden = !user;

  if (!user) {
    $("firebaseAuthUsers").replaceChildren();
    showMessage("firebaseAuthMessage", "");
    return;
  }

  $("firebaseAuthName").textContent =
    user.displayName ||
    user.email ||
    "Пользователь";

  try {
    const snapshot = await get(usersRef);

    const users = snapshot.exists()
      ? Object.values(snapshot.val())
      : [];

    showUsers("firebaseAuthUsers", users);
    showMessage("firebaseAuthMessage", "Вход выполнен!");

  } catch (error) {
    showMessage("firebaseAuthMessage", error.message);
  }
}, error => {
  showMessage("firebaseAuthMessage", error.message);
});

// ВЫХОД ИЗ FIREBASE

$("firebaseLogout").onclick = async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    showMessage("firebaseAuthMessage", error.message);
  }
};

// ПЕРВОНАЧАЛЬНАЯ ЗАГРУЗКА

loadUsers();
loadRealtimeUsers();
updateSupabaseProfile();

console.log("App initialized successfully");
