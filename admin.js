// ============================================================
// VRILZHUB ADMIN — Logic v2.0 (Server)
// ============================================================

const CONFIG = {
    API_URL: "https://vrilzhub-keys.anakpungut014.workers.dev",
};

let adminToken = null;
let allKeys = [];

const els = {
    loginSection: document.getElementById("loginSection"),
    dashboardSection: document.getElementById("dashboardSection"),
    logoutBtn: document.getElementById("logoutBtn"),
    adminUser: document.getElementById("adminUser"),
    adminPass: document.getElementById("adminPass"),
    loginBtn: document.getElementById("loginBtn"),
    loginError: document.getElementById("loginError"),
    keyTypeSelect: document.getElementById("keyTypeSelect"),
    keyNote: document.getElementById("keyNote"),
    createKeyBtn: document.getElementById("createKeyBtn"),
    newKeyResult: document.getElementById("newKeyResult"),
    newKeyText: document.getElementById("newKeyText"),
    newKeyInfo: document.getElementById("newKeyInfo"),
    copyNewKey: document.getElementById("copyNewKey"),
    keyList: document.getElementById("keyList"),
};

async function handleLogin() {
    const username = els.adminUser.value.trim();
    const password = els.adminPass.value;
    if (!username || !password) {
        els.loginError.textContent = "❌ Username & password wajib diisi";
        els.loginError.style.display = "block";
        return;
    }
    els.loginBtn.disabled = true;
    els.loginBtn.textContent = "⏳ Logging in...";
    els.loginError.style.display = "none";

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!data.valid) throw new Error(data.reason || "Login gagal");
        adminToken = data.token;
        localStorage.setItem("vrilz_admin_token", adminToken);
        els.loginSection.style.display = "none";
        els.dashboardSection.style.display = "block";
        els.logoutBtn.style.display = "block";
        await loadKeys();
    } catch (err) {
        els.loginError.textContent = "❌ " + (err.message || "Login gagal");
        els.loginError.style.display = "block";
    } finally {
        els.loginBtn.disabled = false;
        els.loginBtn.textContent = "🔓 Login";
    }
}

function handleLogout() {
    adminToken = null;
    localStorage.removeItem("vrilz_admin_token");
    els.loginSection.style.display = "block";
    els.dashboardSection.style.display = "none";
    els.logoutBtn.style.display = "none";
}

async function handleCreateKey() {
    if (!adminToken) return;
    const type = els.keyTypeSelect.value;
    const note = els.keyNote.value.trim();
    els.createKeyBtn.disabled = true;
    els.createKeyBtn.textContent = "⏳ Generating...";

    try {
        const response = await fetch(`${CONFIG.API_URL}/api/admin/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: adminToken, type, note }),
        });
        const data = await response.json();
        if (!data.valid) throw new Error(data.reason || "Gagal generate key");

        els.newKeyResult.style.display = "block";
        els.newKeyText.textContent = data.key;
        if (!data.expires || data.expires === "lifetime") {
            els.newKeyInfo.textContent = "♾️ Lifetime · " + type.toUpperCase();
        } else {
            const exp = new Date(data.expires);
            els.newKeyInfo.textContent = "📅 " + exp.toLocaleString("id-ID") + " · " + type.toUpperCase();
        }
        await loadKeys();
        els.keyNote.value = "";
    } catch (err) {
        alert("❌ " + (err.message || "Gagal generate key"));
    } finally {
        els.createKeyBtn.disabled = false;
        els.createKeyBtn.textContent = "🎁 Generate Key";
    }
}

async function loadKeys() {
    if (!adminToken) return;
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/admin/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: adminToken }),
        });
        const data = await response.json();
        if (!data.valid) {
            if (data.reason === "Token invalid") handleLogout();
            throw new Error(data.reason || "Gagal load keys");
        }
        allKeys = data.keys || [];
        renderKeys();
    } catch (err) {
        console.error(err);
    }
}

function renderKeys() {
    if (allKeys.length === 0) {
        els.keyList.innerHTML = '<p style="text-align:center; color:var(--text-3); padding:20px;">Belum ada key</p>';
        return;
    }
    els.keyList.innerHTML = allKeys.map(k => {
        let expiredText = "";
        if (!k.expires_at) {
            expiredText = "♾️ Lifetime";
        } else {
            const expDate = new Date(k.expires_at);
            const isExpired = expDate < Date.now();
            expiredText = (isExpired ? "❌ Expired: " : "📅 ") + expDate.toLocaleString("id-ID");
        }
        const redeemed = k.redeemed_at ? " ✅ Redeemed" : " ⏳ Belum redeem";
        return `
            <div class="key-item">
                <div class="key-item-info">
                    <div class="key-item-key">${k.key}</div>
                    <div class="key-item-meta" style="font-size:11px; color:var(--text-3);">
                        ${expiredText}${redeemed}
                        ${k.username ? " · 👤 @" + k.username : ""}
                        ${k.note ? " · 📝 " + k.note : ""}
                    </div>
                </div>
                <span class="key-item-badge">${(k.type || "free").toUpperCase()}</span>
                <button class="key-item-delete" onclick="deleteKey('${k.key}')">🗑️</button>
            </div>
        `;
    }).join("");
}

async function deleteKey(key) {
    if (!confirm("Hapus key " + key + "?")) return;
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/admin/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: adminToken, key }),
        });
        const data = await response.json();
        if (!data.valid) throw new Error(data.reason || "Gagal hapus");
        await loadKeys();
    } catch (err) {
        alert("❌ " + (err.message || "Gagal hapus key"));
    }
}

async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
    }
}

els.loginBtn.addEventListener("click", handleLogin);
els.adminPass.addEventListener("keypress", (e) => { if (e.key === "Enter") handleLogin(); });
els.logoutBtn.addEventListener("click", (e) => { e.preventDefault(); handleLogout(); });
els.createKeyBtn.addEventListener("click", handleCreateKey);
els.copyNewKey.addEventListener("click", async () => {
    const key = els.newKeyText.textContent;
    if (key && key !== "-") {
        await copyText(key);
        els.copyNewKey.textContent = "✅";
        setTimeout(() => { els.copyNewKey.textContent = "📋"; }, 2000);
    }
});

(function autoLogin() {
    const saved = localStorage.getItem("vrilz_admin_token");
    if (saved) {
        adminToken = saved;
        els.loginSection.style.display = "none";
        els.dashboardSection.style.display = "block";
        els.logoutBtn.style.display = "block";
        loadKeys();
    }
})();

console.log("⚡ VRILZHUB Admin loaded (Sistem B)");
