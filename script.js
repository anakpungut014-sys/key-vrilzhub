// ============================================================
// VRILZHUB KEY SYSTEM — Logic v2.0
// ============================================================

const CONFIG = {
    ROBLOX_USER_API: "https://users.roblox.com/v1/usernames/users",
    ROBLOX_AVATAR_API: "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=",
    KEY_API: "https://key-vrilzhub.vrilgg76.workers.dev",
};

let currentUser = null;
let currentKey = null;

const els = {
    inputStep: document.getElementById("inputStep"),
    loadingStep: document.getElementById("loadingStep"),
    profileStep: document.getElementById("profileStep"),
    keyResult: document.getElementById("keyResult"),
    errorStep: document.getElementById("errorStep"),
    usernameInput: document.getElementById("usernameInput"),
    checkBtn: document.getElementById("checkBtn"),
    inputHint: document.getElementById("inputHint"),
    loadingText: document.getElementById("loadingText"),
    avatarImg: document.getElementById("avatarImg"),
    displayName: document.getElementById("displayName"),
    username: document.getElementById("username"),
    userId: document.getElementById("userId"),
    warnUser: document.getElementById("warnUser"),
    getKeyBtn: document.getElementById("getKeyBtn"),
    copyBtn: document.getElementById("copyBtn"),
    resetBtn: document.getElementById("resetBtn"),
    errorResetBtn: document.getElementById("errorResetBtn"),
    keyText: document.getElementById("keyText"),
    keyType: document.getElementById("keyType"),
    keyDuration: document.getElementById("keyDuration"),
    keyExpired: document.getElementById("keyExpired"),
    errorMessage: document.getElementById("errorMessage"),
    totalKeys: document.getElementById("totalKeys"),
};

function showStep(step) {
    els.inputStep.style.display = "none";
    els.loadingStep.style.display = "none";
    els.profileStep.style.display = "none";
    els.keyResult.style.display = "none";
    els.errorStep.style.display = "none";
    if (step === "input") els.inputStep.style.display = "block";
    if (step === "loading") els.loadingStep.style.display = "block";
    if (step === "profile") els.profileStep.style.display = "block";
    if (step === "key") els.keyResult.style.display = "block";
    if (step === "error") els.errorStep.style.display = "block";
}

async function getRobloxUser(username) {
    const response = await fetch(CONFIG.ROBLOX_USER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    if (!data.data || data.data.length === 0) throw new Error("Username tidak ditemukan");
    return data.data[0];
}

async function getRobloxAvatar(userId) {
    try {
        const response = await fetch(`${CONFIG.ROBLOX_AVATAR_API}${userId}&size=150x150&format=Png&isCircular=false`);
        if (!response.ok) return "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-default-Png/150/150/AvatarHeadshot/Png/noFilter";
        const data = await response.json();
        if (data.data && data.data.length > 0 && data.data[0].imageUrl) return data.data[0].imageUrl;
        return "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-default-Png/150/150/AvatarHeadshot/Png/noFilter";
    } catch (err) {
        return "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-default-Png/150/150/AvatarHeadshot/Png/noFilter";
    }
}

async function handleCheckUsername() {
    const username = els.usernameInput.value.trim();
    if (!username) {
        els.inputHint.textContent = "❌ Username tidak boleh kosong";
        els.inputHint.style.color = "var(--error)";
        return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        els.inputHint.textContent = "❌ Username tidak valid (3-20 karakter)";
        els.inputHint.style.color = "var(--error)";
        return;
    }
    els.inputHint.textContent = "Username 3-20 karakter (alfanumerik + _)";
    els.inputHint.style.color = "var(--text-3)";
    showStep("loading");
    els.loadingText.textContent = "Mencari user...";
    try {
        const user = await getRobloxUser(username);
        els.loadingText.textContent = "Mengambil avatar...";
        const avatarUrl = await getRobloxAvatar(user.id);
        currentUser = { id: user.id, name: user.name, displayName: user.displayName, avatar: avatarUrl };
        els.avatarImg.src = avatarUrl;
        els.displayName.textContent = user.displayName;
        els.username.textContent = "@" + user.name;
        els.userId.textContent = "ID: " + user.id;
        els.warnUser.textContent = "@" + user.name;
        showStep("profile");
    } catch (err) {
        els.errorMessage.textContent = err.message || "Gagal mencari user";
        showStep("error");
    }
}

async function handleGetKey() {
    if (!currentUser) return;
    els.getKeyBtn.disabled = true;
    els.getKeyBtn.querySelector(".btn-text").textContent = "⏳ Generating...";
    try {
        const response = await fetch(`${CONFIG.KEY_API}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser.name, userId: currentUser.id }),
        });
        const data = await response.json();
        if (!data.valid) throw new Error(data.reason || "Gagal generate key");
        currentKey = data.key;
        els.keyText.textContent = data.key;
        els.keyType.textContent = data.type.toUpperCase();
        els.keyDuration.textContent = data.type === "free" ? "1 Hari" : data.type;
        if (data.expires === "lifetime") {
            els.keyExpired.textContent = "Never";
        } else {
            const exp = new Date(data.expires);
            els.keyExpired.textContent = exp.toLocaleString("id-ID", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            });
        }
        if (els.totalKeys) {
            els.totalKeys.textContent = parseInt(els.totalKeys.textContent || 0) + 1;
        }
        showStep("key");
    } catch (err) {
        els.errorMessage.textContent = err.message || "Gagal generate key";
        showStep("error");
    } finally {
        els.getKeyBtn.disabled = false;
        els.getKeyBtn.querySelector(".btn-text").textContent = "🎁 Ambil Key Gratis";
    }
}

async function handleCopyKey() {
    if (!currentKey) return;
    try {
        await navigator.clipboard.writeText(currentKey);
        els.copyBtn.textContent = "✅";
        els.copyBtn.style.background = "var(--success)";
        setTimeout(() => {
            els.copyBtn.textContent = "📋";
            els.copyBtn.style.background = "";
        }, 2000);
    } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = currentKey;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        els.copyBtn.textContent = "✅";
        setTimeout(() => { els.copyBtn.textContent = "📋"; }, 2000);
    }
}

function handleReset() {
    els.usernameInput.value = "";
    els.inputHint.textContent = "Username 3-20 karakter (alfanumerik + _)";
    els.inputHint.style.color = "var(--text-3)";
    currentUser = null;
    currentKey = null;
    showStep("input");
}

els.checkBtn.addEventListener("click", handleCheckUsername);
els.usernameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleCheckUsername(); });
els.getKeyBtn.addEventListener("click", handleGetKey);
els.copyBtn.addEventListener("click", handleCopyKey);
els.resetBtn.addEventListener("click", handleReset);
els.errorResetBtn.addEventListener("click", handleReset);

console.log("⚡ VRILZHUB Key System loaded");
