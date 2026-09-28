// ============================================================
// VRILZHUB KEY SYSTEM — Cloudflare Worker
// Handle: generate, validate, admin
// ============================================================

// ====== CONFIG ======
const CONFIG = {
    ADMIN_USER: "admin",
    ADMIN_PASS: "vrilzhub2026", // GANTI INI!
    KEY_PREFIX_FREE: "VRILZ-FREE",
    KEY_PREFIX_PREM: "VRILZ-PREM",
    KEY_PREFIX_VIP: "VRILZ-VIP",
    KEY_PREFIX_LIFE: "VRILZ-LIFE",
    FREE_DURATION_HOURS: 24,
    PREM_DURATION_DAYS: 30,
    VIP_DURATION_DAYS: 90,
};

// ====== CORS HEADERS ======
const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ====== HELPERS ======
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...CORS },
    });
}

function generateKey(prefix, segments = 4) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = prefix;
    for (let i = 0; i < segments; i++) {
        key += "-";
        for (let j = 0; j < 4; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return key;
}

function getExpiry(type) {
    const now = Date.now();
    if (type === "free") return now + CONFIG.FREE_DURATION_HOURS * 3600 * 1000;
    if (type === "premium") return now + CONFIG.PREM_DURATION_DAYS * 86400 * 1000;
    if (type === "vip") return now + CONFIG.VIP_DURATION_DAYS * 86400 * 1000;
    if (type === "lifetime") return "lifetime";
    return now + 86400 * 1000;
}

// ====== ROUTES ======
async function handleGenerateFree(request, env) {
    const body = await request.json();
    const username = (body.username || "").trim();
    const userId = body.userId;

    if (!username || !userId) {
        return json({ valid: false, reason: "Username & userId required" }, 400);
    }

    // Cek apakah user udah pernah ambil key
    const existingKey = await env.KEYS.get(`user:${userId}`);
    if (existingKey) {
        const keyData = JSON.parse(await env.KEYS.get(`key:${existingKey}`));
        // Kalau key masih aktif, return key yang sama
        if (keyData && (keyData.expires === "lifetime" || keyData.expires > Date.now())) {
            return json({
                valid: true,
                key: existingKey,
                type: keyData.type,
                expires: keyData.expires,
                reused: true,
            });
        }
    }

    // Generate key baru
    const key = generateKey(CONFIG.KEY_PREFIX_FREE);
    const expires = getExpiry("free");

    const keyData = {
        key,
        type: "free",
        userId,
        username,
        createdAt: Date.now(),
        expires,
        hwid: null,
    };

    // Simpen ke KV
    await env.KEYS.put(`key:${key}`, JSON.stringify(keyData));
    await env.KEYS.put(`user:${userId}`, key);

    return json({
        valid: true,
        key,
        type: "free",
        expires,
    });
}

async function handleValidate(request, env) {
    const body = await request.json();
    const key = (body.key || "").trim();
    const hwid = body.hwid || "";

    if (!key) {
        return json({ valid: false, reason: "Key required" }, 400);
    }

    const keyDataStr = await env.KEYS.get(`key:${key}`);
    if (!keyDataStr) {
        return json({ valid: false, reason: "Key tidak ditemukan" });
    }

    const keyData = JSON.parse(keyDataStr);

    // Cek expired
    if (keyData.expires !== "lifetime" && keyData.expires < Date.now()) {
        return json({ valid: false, reason: "Key expired" });
    }

    // Cek HWID (lock ke HWID pertama kali pakai)
    if (!keyData.hwid) {
        keyData.hwid = hwid;
        await env.KEYS.put(`key:${key}`, JSON.stringify(keyData));
    } else if (keyData.hwid !== hwid) {
        return json({ valid: false, reason: "Key terikat ke device lain" });
    }

    return json({
        valid: true,
        type: keyData.type,
        expires: keyData.expires,
        username: keyData.username,
    });
}

async function handleAdminLogin(request, env) {
    const body = await request.json();
    const username = body.username;
    const password = body.password;

    if (username === CONFIG.ADMIN_USER && password === CONFIG.ADMIN_PASS) {
        // Generate token
        const token = generateKey("ADMIN", 2);
        await env.KEYS.put(`admin:${token}`, "1", { expirationTtl: 3600 }); // 1 jam
        return json({ valid: true, token });
    }

    return json({ valid: false, reason: "Username atau password salah" }, 401);
}

async function handleAdminCreate(request, env) {
    const body = await request.json();
    const token = body.token;
    const type = body.type;
    const customDays = body.days;
    const note = body.note || "";

    // Cek token
    const tokenValid = await env.KEYS.get(`admin:${token}`);
    if (!tokenValid) {
        return json({ valid: false, reason: "Token invalid" }, 401);
    }

    // Tentukan prefix & expiry
    let prefix, expires;
    if (type === "premium") {
        prefix = CONFIG.KEY_PREFIX_PREM;
        expires = Date.now() + (customDays || CONFIG.PREM_DURATION_DAYS) * 86400 * 1000;
    } else if (type === "vip") {
        prefix = CONFIG.KEY_PREFIX_VIP;
        expires = Date.now() + (customDays || CONFIG.VIP_DURATION_DAYS) * 86400 * 1000;
    } else if (type === "lifetime") {
        prefix = CONFIG.KEY_PREFIX_LIFE;
        expires = "lifetime";
    } else {
        return json({ valid: false, reason: "Type invalid" }, 400);
    }

    const key = generateKey(prefix);
    const keyData = {
        key,
        type,
        createdAt: Date.now(),
        expires,
        hwid: null,
        note,
    };

    await env.KEYS.put(`key:${key}`, JSON.stringify(keyData));

    return json({ valid: true, key, type, expires });
}

async function handleAdminList(request, env) {
    const body = await request.json();
    const token = body.token;

    const tokenValid = await env.KEYS.get(`admin:${token}`);
    if (!tokenValid) {
        return json({ valid: false, reason: "Token invalid" }, 401);
    }

    // List semua key (max 100)
    const keys = [];
    let cursor = null;
    const list = await env.KEYS.list({ limit: 100 });
    
    for (const k of list.keys) {
        if (k.name.startsWith("key:")) {
            const data = await env.KEYS.get(k.name);
            keys.push(JSON.parse(data));
        }
    }

    return json({ valid: true, keys });
}

async function handleAdminDelete(request, env) {
    const body = await request.json();
    const token = body.token;
    const key = body.key;

    const tokenValid = await env.KEYS.get(`admin:${token}`);
    if (!tokenValid) {
        return json({ valid: false, reason: "Token invalid" }, 401);
    }

    await env.KEYS.delete(`key:${key}`);
    return json({ valid: true });
}

// ====== MAIN HANDLER ======
export default {
    async fetch(request, env, ctx) {
        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // User routes
            if (path === "/api/generate" && request.method === "POST") {
                return await handleGenerateFree(request, env);
            }
            if (path === "/api/validate" && request.method === "POST") {
                return await handleValidate(request, env);
            }
            
            // Admin routes
            if (path === "/api/admin/login" && request.method === "POST") {
                return await handleAdminLogin(request, env);
            }
            if (path === "/api/admin/create" && request.method === "POST") {
                return await handleAdminCreate(request, env);
            }
            if (path === "/api/admin/list" && request.method === "POST") {
                return await handleAdminList(request, env);
            }
            if (path === "/api/admin/delete" && request.method === "POST") {
                return await handleAdminDelete(request, env);
            }

            return json({ valid: false, reason: "Not found" }, 404);
        } catch (err) {
            return json({ valid: false, reason: err.message }, 500);
        }
    },
};
