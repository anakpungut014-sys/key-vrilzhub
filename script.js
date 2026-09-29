// ============================================================
// VRILZHUB — script.js v2.1 (Final)
// Server-based key system + cooldown + proper error handling
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

  // Validasi 1: Username kosong
  if (!username) {
    els.inputHint.textContent = "❌ Username tidak boleh kosong";
    els.inputHint.style.color = "var(--error)";
    return;
  }

  // Validasi 2: Format username
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    els.inputHint.textContent = "❌ Username tidak valid (3-20 karakter)";
    els.inputHint.style.color = "var(--error)";
    return;
  }

  // Reset hint + tampilkan loading
  els.inputHint.textContent = "Username 3-20 karakter (huruf, angka, _)";
  els.inputHint.style.color = "var(--text-3)";
  showStep("loading");

  try {
    // Kirim request ke Worker
    const res = await fetch(`${CONFIG.KEY_API}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    // Parse JSON meskipun status bukan 200 (biar bisa baca reason dari server)
    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error("Server response tidak valid (bukan JSON). Cek Worker.");
    }

    // Cek response dari server
    if (!res.ok || !data.valid) {
      els.errorMessage.textContent = data.reason || data.message || `Error ${res.status}`;
      showStep("error");
      return;
    }

    // Sukses — tampilkan key
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
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      els.keyExpired.textContent = "Never";
    }

    showStep("key");
  } catch (err) {
    // Error network / server down / parse error
    console.error("Fetch error:", err);
    els.errorMessage.textContent = err.message || "Gagal konek ke server. Coba lagi.";
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
  setTimeout(() => {
    els.copyBtn.textContent = "📋";
  }, 2000);
}

function handleReset() {
  els.usernameInput.value = "";
  els.inputHint.textContent = "Username 3-20 karakter (huruf, angka, _)";
  els.inputHint.style.color = "var(--text-3)";
  currentKey = null;
  showStep("input");
}

// Event listeners
els.checkBtn.addEventListener("click", handleGetKey);
els.usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleGetKey();
});
els.copyBtn.addEventListener("click", handleCopyKey);
els.resetBtn.addEventListener("click", handleReset);
els.errorResetBtn.addEventListener("click", handleReset);

console.log("⚡ VRILZHUB loaded (v2.1)");
