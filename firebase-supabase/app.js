
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
    getDatabase, ref, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

import {
    getAuth, GoogleAuthProvider, GithubAuthProvider,
    signInWithPopup, linkWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const $ = id => document.getElementById(id);

const supabase = window.supabase.createClient(
    "https://ttouujjiszknleriaotc.supabase.co",
    "sb_publishable_G9kvkZ7u_e94QVMM7eNlgA_Sgb9-a7p"
);

const firebaseApp = initializeApp({
    apiKey: "AIzaSyCj2TRvbdB2v5ny-SMgv7xjKLbJpwpbsis",
    authDomain: "p1pka-11.firebaseapp.com",
    databaseURL: "https://p1pka-11-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "p1pka-11",
    storageBucket: "p1pka-11.firebasestorage.app",
    messagingSenderId: "879240289141",
    appId: "1:879240289141:web:2d0d55173aac5909d5913c"
});

const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);
const usersRef = ref(database, "Users");

const siteUrl = "https://pi1pka.github.io/pipka.github.io/firebase-supabase/";

const state = {
    supabase: { user: null, role: "user", rows: [], sort: "username", asc: true },
    firebase: { user: null, role: "user", rows: [], sort: "username", asc: true }
};

let firebaseListener = null;
let supabaseChannel = null;

// Навигация

function showPage(service) {
    $("supabaseSection").hidden = service !== "supabase";
    $("firebaseSection").hidden = service !== "firebase";

    $("navSupabase").classList.toggle("active", service === "supabase");
    $("navFirebase").classList.toggle("active", service === "firebase");

    $("pageTitle").textContent = service === "supabase" ? "Supabase" : "Firebase";
}

$("navSupabase").onclick = () => showPage("supabase");
$("navFirebase").onclick = () => showPage("firebase");

showPage("supabase");

// Общие функции

function showMessage(id, text = "") {
    $(id).textContent = text;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    return isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function showProfile(service, user, name, email, created, lastLogin) {
    $(`${service}Login`).hidden = !!user;
    $(`${service}Profile`).hidden = !user;
    $(`${service}Data`).hidden = !user;

    if (!user) {
        state[service].rows = [];
        state[service].role = "user";
        return;
    }

    $(`${service}Name`).textContent = name;
    $(`${service}Email`).textContent = email || "—";
    $(`${service}Avatar`).textContent = name.charAt(0).toUpperCase();
    $(`${service}Created`).textContent = formatDate(created);
    $(`${service}LastLogin`).textContent = formatDate(lastLogin);
}

function setRole(service, role) {
    state[service].role = role === "admin" ? "admin" : "user";

    const badge = $(`${service}Role`);
    badge.textContent = state[service].role === "admin" ? "Admin" : "User";
    badge.classList.toggle("admin", state[service].role === "admin");

    renderTable(service);
}

// Таблица

function renderTable(service) {
    const data = state[service];
    const tbody = $(`${service}Rows`);

    const rows = [...data.rows].sort((a, b) => {
        let result;

        if (data.sort === "created_at") {
            result = new Date(a.created_at || 0) - new Date(b.created_at || 0);
        } else {
            result = String(a[data.sort] || "").localeCompare(
                String(b[data.sort] || ""), "ru"
            );
        }

        return data.asc ? result : -result;
    });

    tbody.replaceChildren();
    $(`${service}Count`).textContent = `${rows.length} записей`;

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

    rows.forEach(user => {
        const tr = document.createElement("tr");

        function cell(text) {
            const td = document.createElement("td");
            td.textContent = text;
            return td;
        }

        const username = cell(user.username || "—");
        const password = cell("••••••");
        password.className = "masked-password";

        const roleCell = document.createElement("td");
        const roleBadge = document.createElement("span");

        roleBadge.className = user.role === "admin" ? "role admin" : "role";
        roleBadge.textContent = user.role === "admin" ? "Admin" : "User";
        roleCell.appendChild(roleBadge);

        const date = cell(formatDate(user.created_at));
        const actions = document.createElement("td");

        if (data.role === "admin") {
            const button = document.createElement("button");
            button.className = "delete-button";
            button.textContent = "Удалить";
            button.onclick = () => deleteUser(service, user.id);
            actions.appendChild(button);
        } else {
            actions.textContent = "—";
        }

        tr.append(username, password, roleCell, date, actions);
        tbody.appendChild(tr);
    });
}

function setupSort(service) {
    const columns = {
        Name: "username",
        Role: "role",
        Date: "created_at"
    };

    for (const [name, field] of Object.entries(columns)) {
        const button = $(`${service}Sort${name}`);

        button.onclick = () => {
            const data = state[service];

            data.asc = data.sort === field ? !data.asc : true;
            data.sort = field;

            renderTable(service);
        };
    }
}

setupSort("supabase");
setupSort("firebase");

// Supabase авторизация

async function loginSupabase(provider) {
    const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: siteUrl }
    });

    if (error) showMessage("supabaseAuthMessage", error.message);
}

$("supabaseGoogle").onclick = () => loginSupabase("google");
$("supabaseGithub").onclick = () => loginSupabase("github");


$("supabaseLogout").onclick = async () => {
    const { error } = await supabase.auth.signOut();

    if (error && error.name !== "AuthSessionMissingError") {
        showMessage("supabaseAuthMessage", error.message);
        return;
    }

    showMessage("supabaseAuthMessage");
    await updateSupabase();
};


async function getSupabaseRole(uid) {
    const { data, error } = await supabase
        .from("app_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();

    if (error) throw error;
    if (data) return data.role;

    const { error: insertError } = await supabase
        .from("app_roles")
        .insert({ user_id: uid, role: "user" });

    if (insertError && insertError.code !== "23505") throw insertError;

    return "user";
}

async function loadSupabaseUsers() {
    const { data, error } = await supabase
        .from("Users")
        .select("record_id, username, role, created_at");

    if (error) {
        showMessage("supabaseDbMessage", error.message);
        return;
    }

    state.supabase.rows = (data || []).map(user => ({
        id: user.record_id,
        username: user.username,
        role: user.role || "user",
        created_at: user.created_at
    }));

    renderTable("supabase");
    showMessage("supabaseDbMessage");
}

$("supabaseForm").onsubmit = async event => {
    event.preventDefault();

    const username = $("supabaseUsername").value.trim();
    const password = $("supabasePassword").value;

    if (!state.supabase.user || !username || !password) return;

    const { error } = await supabase.from("Users").insert({
        username,
        password,
        role: "user"
    });

    if (error) {
        showMessage("supabaseDbMessage", error.message);
        return;
    }

    $("supabaseForm").reset();
    await loadSupabaseUsers();
    showMessage("supabaseDbMessage", "Пользователь добавлен");
};


async function updateSupabase() {
    try {
        const { data: { session }, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        // Если пользователь вышел
        if (!session) {
            state.supabase.user = null;
            showProfile("supabase", null);
            setRole("supabase", "user");
            showMessage("supabaseAuthMessage");

            if (supabaseChannel) {
                const channel = supabaseChannel;
                supabaseChannel = null;
                await supabase.removeChannel(channel);
            }
            return;
        }

        const { data: { user }, error } =
            await supabase.auth.getUser();

        if (error) throw error;

        state.supabase.user = user;

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
        setRole("supabase", role);

        await loadSupabaseUsers();

        if (!supabaseChannel) {
            supabaseChannel = supabase
                .channel("users-realtime")
                .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "Users"
                }, loadSupabaseUsers)
                .subscribe();
        }

        // Убираем старые сообщения об ошибках
        showMessage("supabaseAuthMessage");

    } catch (error) {
        if (error.name === "AuthSessionMissingError") {
            state.supabase.user = null;
            showProfile("supabase", null);
            setRole("supabase", "user");
            showMessage("supabaseAuthMessage");
            return;
        }

        showMessage("supabaseAuthMessage", error.message);
    }
}

supabase.auth.onAuthStateChange(() => {
    setTimeout(updateSupabase, 0);
});

updateSupabase();

// Firebase авторизация

async function loginFirebase(provider) {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        let text = error.message;

        if (error.code === "auth/account-exists-with-different-credential") {
            text = "Этот email уже используется. Войдите через Google и привяжите GitHub.";
        }

        showMessage("firebaseAuthMessage", text);
    }
}

$("firebaseGoogle").onclick = () => loginFirebase(new GoogleAuthProvider());
$("firebaseGithub").onclick = () => loginFirebase(new GithubAuthProvider());

$("firebaseLogout").onclick = () => signOut(auth);

$("firebaseLinkGithub").onclick = async () => {
    try {
        await linkWithPopup(auth.currentUser, new GithubAuthProvider());
        $("firebaseLinkBox").hidden = true;
        showMessage("firebaseAuthMessage", "GitHub привязан");
    } catch (error) {
        showMessage("firebaseAuthMessage", error.message);
    }
};

function startFirebaseRealtime() {
    if (firebaseListener) firebaseListener();

    firebaseListener = onValue(usersRef, snapshot => {
        const rows = [];

        snapshot.forEach(child => {
            const user = child.val();

            rows.push({
                id: child.key,
                username: user.username || "",
                role: user.role || "user",
                created_at: user.created_at || null
            });
        });

        state.firebase.rows = rows;
        renderTable("firebase");
        showMessage("firebaseDbMessage");

    }, error => {
        showMessage("firebaseDbMessage", error.message);
    });
}

$("firebaseForm").onsubmit = async event => {
    event.preventDefault();

    const username = $("firebaseUsername").value.trim();
    const password = $("firebasePassword").value;

    if (!auth.currentUser || !username || !password) return;

    try {
        await push(usersRef, {
            username,
            password,
            role: "user",
            created_at: new Date().toISOString()
        });

        $("firebaseForm").reset();
        showMessage("firebaseDbMessage", "Пользователь добавлен");

    } catch (error) {
        showMessage("firebaseDbMessage", error.message);
    }
};

onAuthStateChanged(auth, async user => {
    if (firebaseListener) {
        firebaseListener();
        firebaseListener = null;
    }

    state.firebase.user = user;

    if (!user) {
        showProfile("firebase", null);
        return;
    }

    showProfile(
        "firebase",
        user,
        user.displayName || user.email || "Пользователь",
        user.email,
        user.metadata.creationTime,
        user.metadata.lastSignInTime
    );

    $("firebaseLinkBox").hidden = user.providerData.some(
        provider => provider.providerId === "github.com"
    );

    // Таблица загружается независимо от проверки роли
    startFirebaseRealtime();

    try {
        const snapshot = await import(
            "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js"
        ).then(module =>
            module.get(ref(database, `adminUids/${user.uid}`))
        );

        setRole("firebase", snapshot.val() === true ? "admin" : "user");

    } catch (error) {
        setRole("firebase", "user");
        showMessage("firebaseAuthMessage", error.message);
    }
});

// Удаление

async function deleteUser(service, id) {
    if (state[service].role !== "admin") {
        showMessage(`${service}DbMessage`, "Недостаточно прав");
        return;
    }

    if (!confirm("Удалить запись?")) return;

    try {
        if (service === "supabase") {
            const { error } = await supabase
                .from("Users")
                .delete()
                .eq("record_id", id);

            if (error) throw error;
            await loadSupabaseUsers();
        } else {
            await remove(ref(database, `Users/${id}`));
        }

        showMessage(`${service}DbMessage`, "Запись удалена");

    } catch (error) {
        showMessage(`${service}DbMessage`, error.message);
    }
}

// Apple
$("supabaseApple").onclick = () => {
    showMessage(
        "supabaseAuthMessage",
        "Авторизация через Apple пока не настроена."
    );
};

$("firebaseApple").onclick = () => {
    showMessage(
        "firebaseAuthMessage",
        "Авторизация через Apple пока не настроена."
    );
};

// Вход через Яндекс — Supabase

$("supabaseYandex").onclick = async () => {
    showMessage("supabaseAuthMessage", "Переход на Яндекс...");

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "custom:yandex",
            options: {
                redirectTo: siteUrl,
                skipBrowserRedirect: true
            }
        });

        if (error) throw error;

        if (!data?.url) {
            throw new Error("Supabase не вернул ссылку для входа");
        }

        window.location.assign(data.url);

    } catch (error) {
        console.error("Yandex OAuth:", error);
        showMessage("supabaseAuthMessage", error.message);
    }
};


// Яндекс в Firebase пока не подключён
$("firebaseYandex").onclick = () => {
    showMessage(
        "firebaseAuthMessage",
        "Вход через Яндекс в Firebase пока не настроен."
    );
};


// Авторизация VK ID

const vkAppId = 54880331;
const vkRedirectUrl =
    "https://pi1pka.github.io/pipka.github.io/firebase-supabase/";

function vkMessage(text) {
    $("vkMessage").textContent = text;
}

function vkConfig(state, verifier) {
    if (!window.VKIDSDK) {
        throw new Error("Не удалось загрузить VK ID SDK");
    }

    window.VKIDSDK.Config.init({
        app: vkAppId,
        redirectUrl: vkRedirectUrl,
        state: state,
        codeVerifier: verifier,
        scope: "email"
    });
}

// Нажатие на кнопку VK

$("supabaseVk").onclick = async () => {
    try {
        const state = crypto.randomUUID();

        const verifier = Array.from(
            crypto.getRandomValues(new Uint8Array(32)),
            b => b.toString(16).padStart(2, "0")
        ).join("");

        sessionStorage.setItem("vk_state", state);
        sessionStorage.setItem("vk_verifier", verifier);

        vkConfig(state, verifier);
        vkMessage("Переход на VK ID...");

        await window.VKIDSDK.Auth.login();

    } catch (error) {
        vkMessage(error.message || "Ошибка авторизации VK");
    }
};

// Возвращение на сайт после VK

async function checkVkCallback() {
    const params = new URLSearchParams(window.location.search);

    if (!params.has("code") || !params.has("device_id")) {
        return;
    }

    const state = sessionStorage.getItem("vk_state");
    const verifier = sessionStorage.getItem("vk_verifier");

    if (!state || !verifier || params.get("state") !== state) {
        vkMessage("Ошибка проверки состояния авторизации VK");
        return;
    }

    try {
        vkMessage("Получаем данные VK ID...");

        vkConfig(state, verifier);

        const token = await window.VKIDSDK.Auth.exchangeCode(
            params.get("code"),
            params.get("device_id"),
            verifier
        );

        const result = await window.VKIDSDK.Auth.userInfo(
            token.access_token
        );

        const user = result.user;

        vkMessage(
            "VK ID подтвердил вход: " +
            [user.first_name, user.last_name].filter(Boolean).join(" ")
        );

        sessionStorage.removeItem("vk_state");
        sessionStorage.removeItem("vk_verifier");

        window.history.replaceState(
            null,
            "",
            window.location.pathname
        );

    } catch (error) {
        vkMessage(
            "Ошибка VK ID: " +
            (error.error_description || error.message || error.error || "Неизвестная ошибка")
        );
    }
}

checkVkCallback();
