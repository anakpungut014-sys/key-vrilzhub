// ============================================================
// VRILZHUB KEY SYSTEM — Logic v3.0 (With Proxy)
// ============================================================

const CONFIG = {
    KEY_API: "https://key-vrilzhub.anakpungut014.workers.dev",
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
        const response = await fetch(`${CONFIG.KEY_API}/api/roblox/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        });
        const data = await response.json();
        if (!data.valid) throw new Error(data.reason || "Username tidak ditemukan");
        currentUser = data.user;
        els.avatarImg.src = data.user.avatar;
        els.displayName.textContent = data.user.displayName;
        els.username.textContent = "@" + data.user.name;
        els.userId.textContent = "ID: " + data.user.id;
        els.warnUser.textContent = "@" + data.user.name;
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
        if (data.expires === "lifetime" || !data.expires) {
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
