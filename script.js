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

function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "VRILZ-FREE";
  for (let i = 0; i < 3; i++) {
    key += "-";
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return key;
}

function handleGetKey() {
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
  setTimeout(() => {
    const key = generateKey();
    els.keyText.textContent = key;
    els.keyType.textContent = "FREE";
    els.keyDuration.textContent = "1 Hari";
    els.warnUser.textContent = "@" + username;
    const exp = new Date(Date.now() + 24 * 3600 * 1000);
    els.keyExpired.textContent = exp.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    showStep("key");
  }, 1500);
}

async function handleCopyKey() {
  const key = els.keyText.textContent;
  try {
    await navigator.clipboard.writeText(key);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = key;
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
  showStep("input");
}

els.checkBtn.addEventListener("click", handleGetKey);
els.usernameInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleGetKey(); });
els.copyBtn.addEventListener("click", handleCopyKey);
els.resetBtn.addEventListener("click", handleReset);
els.errorResetBtn.addEventListener("click", handleReset);

console.log("⚡ VRILZHUB loaded");
