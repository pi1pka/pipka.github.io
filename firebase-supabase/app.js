
// FIREBASE SDK
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import { getDatabase, ref, push, get, onValue } from
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

// НАСТРОЙКИ SUPABASE
const client = window.supabase.createClient(
  "https://ttouujjiszknleriaotc.supabase.co",
  "sb_publishable_G9kvkZ7u_e94QVMM7eNlgA_Sgb9-a7p"
);

// НАСТРОЙКИ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCj2TRvbdB2v5ny-SMgv7xjKLbJpwpbsis",
  authDomain: "p1pka-11.firebaseapp.com",
  databaseURL: "https://p1pka-11-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "p1pka-11",
  storageBucket: "p1pka-11.firebasestorage.app",
  messagingSenderId: "879240289141",
  appId: "1:879240289141:web:2d0d55173aac5909d5913c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const usersRef = ref(db, "Users");

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
const $ = id => document.getElementById(id);

function showMessage(id, text) {
  $(id).textContent = text;
}

function showUsers(id, users) {
  const list = $(id);
  list.replaceChildren();

  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user.username ?? "Без имени";
    list.appendChild(li);
  });
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
function openTab(tab) {
  const isAuth = tab === "auth";

  $("authSection").hidden = !isAuth;
  $("databaseSection").hidden = isAuth;

  $("authTab").classList.toggle("active", isAuth);
  $("databaseTab").classList.toggle("active", !isAuth);
}

$("authTab").onclick = () => openTab("auth");
$("databaseTab").onclick = () => openTab("database");

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

function loadUsers() {
  return loadSupabase("usersList", "message");
}

function loadRealtimeUsers() {
  return loadSupabase(
    "supabaseRealtimeList",
    "supabaseRealtimeMessage"
  );
}

// SUPABASE INSERT
$("userForm").onsubmit = async event => {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

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
    showMessage("supabaseRealtimeMessage", "Realtime: " + status);

    if (status === "SUBSCRIBED") {
      loadRealtimeUsers();
    }
  });

// GITHUB АВТОРИЗАЦИЯ
$("githubLogin").onclick = async () => {
    console.log("GitHub button clicked!");
  showMessage("authMessage", "Переход на GitHub...");

  const { error } = await client.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo:
        "https://pi1pka.github.io/pipka.github.io/firebase-supabase/"
    }
  });

  if (error) {
    showMessage("authMessage", error.message);
  }
};

// GOOGLE АВТОРИЗАЦИЯ
$("googleLogin").onclick = async () => {
  showMessage("authMessage", "Переход на Google...");

  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        "https://pi1pka.github.io/pipka.github.io/firebase-supabase/"
    }
  });

  if (error) {
    showMessage("authMessage", error.message);
  }
};


// ПРОФИЛЬ ПОСЛЕ ВХОДА
async function updateProfile() {
  const { data: { user }, error } = await client.auth.getUser();

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
}

// ВЫХОД ИЗ АККАУНТА
$("logoutBtn").onclick = async () => {
  const { error } = await client.auth.signOut();

  if (error) {
    showMessage("authMessage", error.message);
    return;
  }

  showMessage("authMessage", "");
  await updateProfile();
};

// ОТСЛЕЖИВАНИЕ АВТОРИЗАЦИИ
client.auth.onAuthStateChange(() => {
  setTimeout(updateProfile, 0);
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
  showMessage("firebaseRealtimeMessage", "Realtime активен");
}, error => {
  showMessage("firebaseRealtimeMessage", error.message);
});

// ПЕРВОНАЧАЛЬНАЯ ЗАГРУЗКА
loadUsers();
loadRealtimeUsers();
updateProfile();
