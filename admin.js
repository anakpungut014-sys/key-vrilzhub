// ============================================================
// VRILZHUB ADMIN — Logic (D1 Compatible)
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
    customDays: document.getElementById("customDays"),
    keyNote: document.getElementById("keyNote"),
    createKeyBtn: document.getElementById("createKeyBtn"),
    newKeyResult: document.getElementById("newKeyResult"),
    newKeyText: document.getElementById("newKeyText"),
    newKeyInfo: document.getElementById("newKeyInfo"),
    copyNewKey: document.getElementById("copyNewKey"),
    keyList: document.getElementById("keyList"),
    keyCount: document.getElementById("keyCount"),
    refreshBtn: document.getElementById("refreshBtn"),
    searchKey: document.getElementById("searchKey"),
    statTotal: document.getElementById("statTotal"),
    statFree: document.getElementById("statFree"),
    statPremium: document.getElementById("statPremium"),
    statVip: document.getElementById("statVip"),
    statLifetime: document.getElementById("statLifetime"),
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
    els.adminUser.value = "";
    els.adminPass.value = "";
}

async function handleCreateKey() {
    if (!adminToken) return;
    const type = els.keyTypeSelect.value;
    const days = els.customDays.value ? parseInt(els.customDays.value) : null;
    const note = els.keyNote.value.trim();
    els.createKeyBtn.disabled = true;
    els.createKeyBtn.textContent = "⏳ Generating...";
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/admin/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: adminToken, type, days, note }),
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
        els.customDays.value = "";
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
        renderStats();
    } catch (err) {
        console.error(err);
    }
}

function renderKeys() {
    const search = els.searchKey.value.toLowerCase().trim();
    let filtered = allKeys;
    if (search) {
        filtered = allKeys.filter(k => 
            (k.key || "").toLowerCase().includes(search) ||
            (k.username && k.username.toLowerCase().includes(search)) ||
            (k.note && k.note.toLowerCase().includes(search))
        );
    }
    els.keyCount.textContent = filtered.length + " keys";
    if (filtered.length === 0) {
        els.keyList.innerHTML = '<p style="text-align: center; color: var(--text-3); padding: 20px;">Nggak ada key</p>';
        return;
    }
    filtered.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    els.keyList.innerHTML = filtered.map(k => {
        const badgeClass = "badge-" + (k.type || "free");
        let expiredText = "";
        if (!k.expires_at) {
            expiredText = "♾️ Lifetime";
        } else {
            const expDate = new Date(k.expires_at);
            const isExpired = expDate < Date.now();
            expiredText = (isExpired ? "❌ Expired: " : "📅 ") + expDate.toLocaleString("id-ID");
        }
        return `
            <div class="key-item">
                <div class="key-item-info">
                    <div class="key-item-key">${k.key}</div>
                    <div class="key-item-meta">
                        ${expiredText}
                        ${k.username ? " · 👤 @" + k.username : ""}
                        ${k.note ? " · 📝 " + k.note : ""}
                    </div>
                </div>
                <span class="key-item-badge ${badgeClass}">${(k.type || "free").toUpperCase()}</span>
                <button class="key-item-delete" onclick="deleteKey('${k.key}')">🗑️</button>
            </div>
        `;
    }).join("");
}

function renderStats() {
    const counts = { free: 0, premium: 0, vip: 0, lifetime: 0 };
    allKeys.forEach(k => {
        if (counts[k.type] !== undefined) counts[k.type]++;
    });
    els.statTotal.textContent = allKeys.length;
    els.statFree.textContent = counts.free;
    els.statPremium.textContent = counts.premium;
    els.statVip.textContent = counts.vip;
    els.statLifetime.textContent = counts.lifetime;
}

async function deleteKey(key) {
    if (!confirm("Yakin mau hapus key " + key + "?")) return;
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
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
    }
}

els.loginBtn.addEventListener("click", handleLogin);
els.adminPass.addEventListener("keypress", (e) => { if (e.key === "Enter") handleLogin(); });
els.adminUser.addEventListener("keypress", (e) => { if (e.key === "Enter") handleLogin(); });
els.logoutBtn.addEventListener("click", (e) => { e.preventDefault(); handleLogout(); });
els.createKeyBtn.addEventListener("click", handleCreateKey);
els.refreshBtn.addEventListener("click", loadKeys);
els.searchKey.addEventListener("input", renderKeys);
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

console.log("⚡ VRILZHUB Admin loaded");
