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
  searchKey: document.getElementById("searchKey"),
  statTotal: document.getElementById("statTotal"),
  statFree: document.getElementById("statFree"),
  statPrem: document.getElementById("statPrem"),
  statVip: document.getElementById("statVip"),
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
  els.loginBtn.textContent = "⏳ Login...";
  els.loginError.style.display = "none";

  try {
    const res = await fetch(`${CONFIG.API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
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
    const res = await fetch(`${CONFIG.API_URL}/api/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: adminToken, type, note }),
    });
    const data = await res.json();
    if (!data.valid) throw new Error(data.reason || "Gagal generate");
    els.newKeyResult.style.display = "block";
    els.newKeyText.textContent = data.key;
    if (!data.expires || data.expires === "lifetime") {
      els.newKeyInfo.textContent = "♾️ Lifetime";
    } else {
      els.newKeyInfo.textContent = "📅 " + new Date(data.expires).toLocaleString("id-ID");
    }
    await loadKeys();
    els.keyNote.value = "";
  } catch (err) {
    alert("❌ " + err.message);
  } finally {
    els.createKeyBtn.disabled = false;
    els.createKeyBtn.textContent = "🎁 Generate Key";
  }
}

async function loadKeys() {
  if (!adminToken) return;
  try {
    const res = await fetch(`${CONFIG.API_URL}/api/admin/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: adminToken }),
    });
    const data = await res.json();
    if (!data.valid) {
      if (data.reason === "Token invalid") handleLogout();
      throw new Error(data.reason);
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
  let list = allKeys;
  if (search) {
    list = allKeys.filter(k =>
      (k.key || "").toLowerCase().includes(search) ||
      (k.username && k.username.toLowerCase().includes(search))
    );
  }
  if (list.length === 0) {
    els.keyList.innerHTML = '<p style="text-align:center; color:var(--text-3); padding:20px;">Belum ada key</p>';
    return;
  }
  els.keyList.innerHTML = list.map(k => {
    let expText = !k.expires_at ? "♾️ Lifetime" :
      (new Date(k.expires_at) < Date.now() ? "❌ Expired " : "📅 ") + new Date(k.expires_at).toLocaleString("id-ID");
    const redeemed = k.redeemed_at ? " ✅ Redeemed" : " ⏳ Belum redeem";
    return `
      <div class="key-item">
        <div style="flex:1; min-width:0;">
          <div class="key-item-key">${k.key}</div>
          <div class="key-item-meta">${expText}${redeemed}${k.username ? " · @" + k.username : ""}${k.note ? " · " + k.note : ""}</div>
        </div>
        <span class="key-item-badge">${(k.type || "free")}</span>
        <button class="key-item-del" onclick="deleteKey('${k.key}')">🗑️</button>
      </div>
    `;
  }).join("");
}

function renderStats() {
  const c = { free: 0, premium: 0, vip: 0, lifetime: 0 };
  allKeys.forEach(k => { if (c[k.type] !== undefined) c[k.type]++; });
  els.statTotal.textContent = allKeys.length;
  els.statFree.textContent = c.free;
  els.statPrem.textContent = c.premium;
  els.statVip.textContent = c.vip;
}

async function deleteKey(key) {
  if (!confirm("Hapus key " + key + "?")) return;
  try {
    await fetch(`${CONFIG.API_URL}/api/admin/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: adminToken, key }),
    });
    await loadKeys();
  } catch (err) { alert("❌ Gagal hapus"); }
}

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = t; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  }
}

els.loginBtn.addEventListener("click", handleLogin);
els.adminPass.addEventListener("keypress", e => { if (e.key === "Enter") handleLogin(); });
els.logoutBtn.addEventListener("click", e => { e.preventDefault(); handleLogout(); });
els.createKeyBtn.addEventListener("click", handleCreate
