// ============================================================
// VRILZHUB KEY SYSTEM — Cloudflare Worker (D1 SQLite)
// ============================================================

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

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

function getExpiry(type, customDays = null) {
    const now = Date.now();
    if (type === "free") return now + CONFIG.FREE_DURATION_HOURS * 3600 * 1000;
    if (type === "premium") return now + (customDays || CONFIG.PREM_DURATION_DAYS) * 86400 * 1000;
    if (type === "vip") return now + (customDays || CONFIG.VIP_DURATION_DAYS) * 86400 * 1000;
    if (type === "lifetime") return null;
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

    const existing = await env.DB.prepare(
        "SELECT key FROM user_keys WHERE user_id = ?"
    ).bind(userId).first();

    if (existing) {
        const keyData = await env.DB.prepare(
            "SELECT * FROM keys WHERE key = ?"
        ).bind(existing.key).first();

        if (keyData && (keyData.expires_at === null || keyData.expires_at > Date.now())) {
            return json({
                valid: true,
                key: existing.key,
                type: keyData.type,
                expires: keyData.expires_at || "lifetime",
                reused: true,
            });
        }
    }

    const key = generateKey(CONFIG.KEY_PREFIX_FREE);
    const expiresAt = getExpiry("free");
    const now = Date.now();

    await env.DB.prepare(
        "INSERT INTO keys (key, type, user_id, username, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(key, "free", userId, username, now, expiresAt).run();

    await env.DB.prepare(
        "INSERT OR REPLACE INTO user_keys (user_id, key, created_at) VALUES (?, ?, ?)"
    ).bind(userId, key, now).run();

    return json({
        valid: true,
        key,
        type: "free",
        expires: expiresAt,
    });
}

async function handleValidate(request, env) {
    const body = await request.json();
    const key = (body.key || "").trim();
    const hwid = body.hwid || "";

    if (!key) {
        return json({ valid: false, reason: "Key required" }, 400);
    }

    const keyData = await env.DB.prepare(
        "SELECT * FROM keys WHERE key = ?"
    ).bind(key).first();

    if (!keyData) {
        return json({ valid: false, reason: "Key tidak ditemukan" });
    }

    if (keyData.expires_at !== null && keyData.expires_at < Date.now()) {
        return json({ valid: false, reason: "Key expired" });
    }

    if (!keyData.hwid) {
        await env.DB.prepare(
            "UPDATE keys SET hwid = ? WHERE key = ?"
        ).bind(hwid, key).run();
    } else if (keyData.hwid !== hwid) {
        return json({ valid: false, reason: "Key terikat ke device lain" });
    }

    return json({
        valid: true,
        type: keyData.type,
        expires: keyData.expires_at || "lifetime",
        username: keyData.username,
    });
}

async function handleAdminLogin(request, env) {
    const body = await request.json();
    const username = body.username;
    const password = body.password;

    if (username === CONFIG.ADMIN_USER && password === CONFIG.ADMIN_PASS) {
        const token = generateKey("ADMIN", 2);
        const now = Date.now();
        const expiresAt = now + 3600 * 1000;

        await env.DB.prepare(
            "INSERT INTO admin_tokens (token, created_at, expires_at) VALUES (?, ?, ?)"
        ).bind(token, now, expiresAt).run();

        return json({ valid: true, token });
    }

    return json({ valid: false, reason: "Username atau password salah" }, 401);
}

async function handleAdminCreate(request, env) {
    const body = await request.json();
    const token = body.token;
    const type = body.type;
    const customDays = body.days || null;
    const note = body.note || "";

    const tokenData = await env.DB.prepare(
        "SELECT * FROM admin_tokens WHERE token = ? AND expires_at > ?"
    ).bind(token, Date.now()).first();

    if (!tokenData) {
        return json({ valid: false, reason: "Token invalid" }, 401);
    }

    let prefix;
    if (type === "premium") prefix = CONFIG.KEY_PREFIX_PREM;
    else if (type === "vip") prefix = CONFIG.KEY_PREFIX_VIP;
    else if (type === "lifetime") prefix = CONFIG.KEY_PREFIX_LIFE;
    else return json({ valid: false, reason: "Type invalid" }, 400);

    const key = generateKey(prefix);
    const now = Date.now();
    const expiresAt = getExpiry(type, customDays);

    await env.DB.prepare(
        "INSERT INTO keys (key, type, created_at, expires_at, note) VALUES (?, ?, ?, ?, ?)"
    ).bind(key, type, now, expiresAt, note).run();

    return json({ valid: true, key, type, expires: expiresAt || "lifetime" });
}

async function handleAdminList(request, env) {
    const body = await request.json();
    const token = body.token;

    const tokenData = await env.DB.prepare(
        "SELECT * FROM admin_tokens WHERE token = ? AND expires_at > ?"
    ).bind(token, Date.now()).first();

    if (!tokenData) {
        return json({ valid: false, reason: "Token invalid" }, 401);
    }

    const result = await env.DB.prepare(
        "SELECT * FROM keys ORDER BY created_at DESC LIMIT 100"
    ).all();

    return json({ valid: true, keys: result.results || [] });
}

async function handleAdminDelete(request, env) {
    const body = await request.json();
    const token = body.token;
    const key = body.key;

    const tokenData = await env.DB.prepare(
        "SELECT * FROM admin_tokens WHERE token = ? AND expires_at > ?"
    ).bind(token, Date.now()).first();

    if (!tokenData) {
        return json({ valid: false, reason: "Token invalid" }, 401);
    }

    await env.DB.prepare("DELETE FROM keys WHERE key = ?").bind(key).run();
    return json({ valid: true });
}

// ====== MAIN HANDLER ======
export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === "/api/generate" && request.method === "POST") {
                return await handleGenerateFree(request, env);
            }
            if (path === "/api/validate" && request.method === "POST") {
                return await handleValidate(request, env);
            }
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
