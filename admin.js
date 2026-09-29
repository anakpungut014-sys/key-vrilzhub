const ADMIN_USER = "admin";
const ADMIN_PASS = "vrilzhub2026";

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

function getKeys() {
  return JSON.parse(localStorage.getItem("vrilz_keys") || "[]");
}

function saveKeys(keys) {
  localStorage.setItem("vrilz_keys", JSON.stringify(keys));
}

function generateKey(type) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let prefix = "VRILZ-PREM";
  if (type === "vip") prefix = "VRILZ-VIP";
  if (type === "lifetime") prefix = "VRILZ-LIFE";
  let key = prefix;
  for (let i = 0; i < 3; i++) {
    key += "-";
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return key;
}

function handleLogin() {
  const u = els.adminUser.value.trim();
  const p = els.adminPass.value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    localStorage.setItem("vrilz_admin", "1");
    showDashboard();
  } else {
    els.loginError.textContent = "❌ Username atau password salah";
    els.loginError.style.display = "block";
  }
}

function showDashboard() {
  els.loginSection.style.display = "none";
  els.dashboardSection.style.display = "block";
  els.logoutBtn.style.display = "block";
  renderKeys();
}

function handleLogout() {
  localStorage.removeItem("vrilz_admin");
  els.loginSection.style.display = "block";
  els.dashboardSection.style.display = "none";
  els.logoutBtn.style.display = "none";
}

function handleCreateKey() {
  const type = els.keyTypeSelect.value;
  const note = els.keyNote.value.trim();
  const key = generateKey(type);
  const now = Date.now();
  let expiresAt = null;
  if (type === "premium") expiresAt = now + 30 * 86400 * 1000;
  if (type === "vip") expiresAt = now + 90 * 86400 * 1000;
  const keys = getKeys();
  keys.unshift({ key, type, note, created_at: now, expires_at: expiresAt });
  saveKeys(keys);
  els.newKeyResult.style.display = "block";
  els.newKeyText.textContent = key;
  els.newKeyInfo.textContent = expiresAt ? "📅 Expired: " + new Date(expiresAt).toLocaleString("id-ID") : "♾️ Lifetime";
  els.keyNote.value = "";
  renderKeys();
}

function deleteKey(key) {
  if (!confirm("Hapus key " + key + "?")) return;
  const keys = getKeys().filter(k => k.key !== key);
  saveKeys(keys);
  renderKeys();
}

function renderKeys() {
  const keys = getKeys();
  if (keys.length === 0) {
    els.keyList.innerHTML = '<p style="text-align:center; color:var(--text-3); padding:20px;">Belum ada key</p>';
    return;
  }
  els.keyList.innerHTML = keys.map(k => `
    <div class="key-item">
      <div>
        <div class="key-item-key">${k.key}</div>
        <div style="font-size:11px; color:var(--text-3); margin-top:4px;">
          ${k.expires_at ? "📅 " + new Date(k.expires_at).toLocaleString("id-ID") : "♾️ Lifetime"}
          ${k.note ? " · 📝 " + k.note : ""}
        </div>
      </div>
      <span class="key-item-badge">${k.type.toUpperCase()}</span>
      <button class="key-item-delete" onclick="deleteKey('${k.key}')">🗑️</button>
    </div>
  `).join("");
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
els.createKeyBtn.addEventListener("click", handleCreateKey);
els.copyNewKey.addEventListener("click", async () => {
  const k = els.newKeyText.textContent;
  if (k && k !== "-") {
    await copyText(k);
    els.copyNewKey.textContent = "✅";
    setTimeout(() => els.copyNewKey.textContent = "📋", 2000);
  }
});

if (localStorage.getItem("vrilz_admin") === "1") showDashboard();
console.log("⚡ Admin loaded");
