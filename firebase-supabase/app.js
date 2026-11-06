// FIREBASE IMPORTS
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getDatabase,
  ref,
  push,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// ОБЩИЕ НАСТРОЙКИ
const $ = id => document.getElementById(id);

const redirectUrl =
  "https://pi1pka.github.io/pipka.github.io/firebase-supabase/";


// SUPABASE
const client = window.supabase.createClient(
  "https://ttouujjiszknleriaotc.supabase.co",
  "sb_publishable_G9kvkZ7u_e94QVMM7eNlgA_Sgb9-a7p"
);

// FIREBASE
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

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function showMessage(id, text) {
  $(id).textContent = text;
}

function showUsers(id, users) {
  const list = $(id);
  list.replaceChildren();

  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user?.username ?? "Без имени";
    list.appendChild(li);
  });
}

function getFirebaseUsers(snapshot) {
  return snapshot.exists()
    ? Object.values(snapshot.val())
    : [];
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
let currentTab = "auth";
let currentAuth = "supabase";

function updateNavigation() {
  const isAuth = currentTab === "auth";
  const isSupabase = currentAuth === "supabase";

  $("authSwitcher").hidden = !isAuth;
  $("databaseSection").hidden = isAuth;

  $("authSection").hidden =
    !isAuth || !isSupabase;

  $("firebaseAuthSection").hidden =
    !isAuth || isSupabase;

  $("authTab").classList.toggle("active", isAuth);
  $("databaseTab").classList.toggle("active", !isAuth);

  $("showSupabaseAuth").classList.toggle(
    "active", isSupabase
  );

  $("showFirebaseAuth").classList.toggle(
    "active", !isSupabase
  );
}

$("authTab").onclick = () => {
  currentTab = "auth";
  updateNavigation();
};

$("databaseTab").onclick = () => {
  currentTab = "database";
  updateNavigation();
};

$("showSupabaseAuth").onclick = () => {
  currentAuth = "supabase";
  updateNavigation();
};

$("showFirebaseAuth").onclick = () => {
  currentAuth = "firebase";
  updateNavigation();
};

updateNavigation();

// SUPABASE SELECT
async function loadSupabaseUsers(elementId, messageId) {
  try {
    const { data, error } = await client
      .from("Users")
      .select("username");

    if (error) throw error;

    showUsers(elementId, data || []);

    return true;
  } catch (error) {
    if (messageId) {
      showMessage(messageId, error.message);
    }
    return false;
  }
}

async function loadUsers() {
  const ok = await loadSupabaseUsers(
    "usersList", "message"
  );

  if (ok) {
    showMessage("message", "Данные загружены!");
  }
}

$("supabaseSelect").onclick = loadUsers;

// SUPABASE INSERT
$("userForm").onsubmit = async event => {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  if (!username || !password) return;

  try {
    const { error } = await client
      .from("Users")
      .insert({ username, password });

    if (error) throw error;

    $("userForm").reset();

    await loadSupabaseUsers("usersList", "message");
    showMessage("message", "Пользователь добавлен!");

  } catch (error) {
    showMessage("message", error.message);
  }
};

// SUPABASE REALTIME
async function loadRealtimeUsers() {
  await loadSupabaseUsers(
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


// SUPABASE AUTH
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

// GITHUB
$("githubLogin").onclick = () => {
  loginSupabase("github");
};

// GOOGLE
$("googleLogin").onclick = () => {
  loginSupabase("google");
};

// YANDEX
$("yandexLogin").onclick = () => {
  loginSupabase("custom:yandex");
};

// APPLE: УВЕДОМЛЕНИЕ
$("appleLogin").onclick = () => {
  $("appleNotice").hidden =
    !$("appleNotice").hidden;
};

// ПРОФИЛЬ SUPABASE
async function updateSupabaseProfile() {
  try {
    const { data: { user }, error } =
      await client.auth.getUser();

    if (error && !user) {
      console.warn("Supabase auth:", error.message);
    }

    if (!user) {
      $("authButtons").hidden = false;
      $("authProfile").hidden = true;
      $("authUsersList").replaceChildren();
      showMessage("authMessage", "");
      return;
    }

    $("authButtons").hidden = true;
    $("authProfile").hidden = false;

    $("authUsername").textContent =
      user.user_metadata?.user_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Пользователь";

    const ok = await loadSupabaseUsers(
      "authUsersList", "authMessage"
    );

    if (ok) {
      showMessage("authMessage", "Вход выполнен!");
    }

  } catch (error) {
    showMessage("authMessage", error.message);
  }
}

// SUPABASE LOGOUT
$("logoutBtn").onclick = async () => {
  try {
    const { error } = await client.auth.signOut();

    if (error) throw error;

    await updateSupabaseProfile();

  } catch (error) {
    showMessage("authMessage", error.message);
  }
};

// SUPABASE AUTH STATE
client.auth.onAuthStateChange(() => {
  setTimeout(() => {
    updateSupabaseProfile();
  }, 0);
});

// FIREBASE SELECT
async function loadFirebaseUsers() {
  try {
    const snapshot = await get(usersRef);

    showUsers(
      "firebaseUsersList",
      getFirebaseUsers(snapshot)
    );

    showMessage("firebaseMessage", "Данные загружены!");

  } catch (error) {
    showMessage("firebaseMessage", error.message);
  }
}

$("firebaseSelect").onclick = loadFirebaseUsers;

// FIREBASE INSER
$("firebaseForm").onsubmit = async event => {
  event.preventDefault();

  const username = $("firebaseUsername").value.trim();
  const password = $("firebasePassword").value;

  if (!username || !password) return;

  try {
    await push(usersRef, { username, password });

    $("firebaseForm").reset();

    showMessage(
      "firebaseMessage",
      "Пользователь добавлен!"
    );

  } catch (error) {
    showMessage("firebaseMessage", error.message);
  }
};

// FIREBASE REALTIME
onValue(usersRef, snapshot => {
  showUsers(
    "firebaseRealtimeList",
    getFirebaseUsers(snapshot)
  );

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

// FIREBASE AUTH
// GOOGLE
$("firebaseGoogleLogin").onclick = async () => {
  try {
    showMessage(
      "firebaseAuthMessage",
      "Открываем Google..."
    );

    const provider = new GoogleAuthProvider();

    await signInWithPopup(firebaseAuth, provider);

  } catch (error) {
    showMessage("firebaseAuthMessage", error.message);
  }
};

// GITHUB
$("firebaseGithubLogin").onclick = async () => {
  try {
    showMessage(
      "firebaseAuthMessage",
      "Открываем GitHub..."
    );

    const provider = new GithubAuthProvider();

    await signInWithPopup(firebaseAuth, provider);

  } catch (error) {
    showMessage("firebaseAuthMessage", error.message);
  }
};

// ПРОФИЛЬ FIREBASE
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

    showUsers(
      "firebaseAuthUsers",
      getFirebaseUsers(snapshot)
    );

    showMessage(
      "firebaseAuthMessage",
      "Вход выполнен!"
    );

  } catch (error) {
    showMessage("firebaseAuthMessage", error.message);
  }

}, error => {
  showMessage("firebaseAuthMessage", error.message);
});

// FIREBASE LOGOUT
$("firebaseLogout").onclick = async () => {
  try {
    await signOut(firebaseAuth);

  } catch (error) {
    showMessage("firebaseAuthMessage", error.message);
  }
};

// ЗАПУС
loadUsers();
loadRealtimeUsers();
updateSupabaseProfile();

console.log("App initialized successfully");
