// ============================================================
// VRILZHUB — script.js v2.0 (Sistem B: Server + Cooldown)
// ============================================================

const CONFIG = {
    KEY_API: "https://vrilzhub-keys.anakpungut014.workers.dev",
};

let currentKey = null;

const els = {
    inputStep: document.getElementById("inputStep"),
    loadingStep: document.getElementById("loadingStep"),
    keyResult: document.getElementById("keyResult"),
    errorStep: document.getElementById("errorStep"),
    usernameInput: document.getElementById("usernameInput"),
    checkBtn: document.getElementById("checkBtn"),
    inputHint: document.getElementById("inputHint"),
    loadingText: document.getElementById("loadingText"),
    keyText: document.getElementById("keyText"),
    keyType: document.getElementById("keyType"),
    keyDuration: document.getElementById("keyDuration"),
    keyExpired: document.getElementById("keyExpired"),
    warnUser: document.getElementById("warnUser"),
    copyBtn: document.getElementById("copyBtn"),
    resetBtn: document.getElementById("resetBtn"),
    errorResetBtn: document.getElementById("errorResetBtn"),
    errorMessage: document.getElementById("errorMessage"),
};

function showStep(step) {
    els.inputStep.style.display = "none";
    els.loadingStep.style.display = "none";
    els.keyResult.style.display = "none";
    els.errorStep.style.display = "none";
    if (step === "input") els.inputStep.style.display = "block";
    if (step === "loading") els.loadingStep.style.display = "block";
    if (step === "key") els.keyResult.style.display = "block";
    if (step === "error") els.errorStep.style.display = "block";
}

async function handleGetKey() {
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

    try {
        const response = await fetch(`${CONFIG.KEY_API}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
        });

        const data = await response.json();

        if (!data.valid) {
            els.errorMessage.textContent = data.reason || "Gagal generate key";
            showStep("error");
            return;
        }

        currentKey = data.key;
        els.keyText.textContent = data.key;
        els.keyType.textContent = (data.type || "free").toUpperCase();
        els.warnUser.textContent = "@" + username;

        if (data.unredeemed) {
            els.keyDuration.textContent = "30 menit (belum redeem)";
        } else {
            els.keyDuration.textContent = "1 Hari";
        }

        if (data.expires) {
            const exp = new Date(data.expires);
            els.keyExpired.textContent = exp.toLocaleString("id-ID", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
        } else {
            els.keyExpired.textContent = "Never";
        }

        showStep("key");
    } catch (err) {
        els.errorMessage.textContent = err.message || "Gagal konek ke server";
        showStep("error");
    }
}

async function handleCopyKey() {
    if (!currentKey) return;
    try {
        await navigator.clipboard.writeText(currentKey);
    } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = currentKey;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
    }
    els.copyBtn.textContent = "✅";
    setTimeout(() => { els.copyBtn.textContent = "📋"; }, 2000);
}

function handleReset() {
    els.usernameInput.value = "";
    els.inputHint.textContent = "Username 3-20 karakter (alfanumerik + _)";
    els.inputHint.style.color = "var(--text-3)";
    currentKey = null;
    showStep("input");
}

els.checkBtn.addEventListener("click", handleGetKey);
els.usernameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleGetKey(); });
els.copyBtn.addEventListener("click", handleCopyKey);
els.resetBtn.addEventListener("click", handleReset);
els.errorResetBtn.addEventListener("click", handleReset);

console.log("⚡ VRILZHUB loaded (Sistem B)");
