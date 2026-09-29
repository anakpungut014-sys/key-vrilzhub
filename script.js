// ============================================================
// VRILZHUB KEY SYSTEM — Worker v2.0 (Sistem B)
// ============================================================

const CONFIG = {
    ADMIN_USER: "admin",
    ADMIN_PASS: "vrilzhub2026",
    KEY_PREFIX_FREE: "VRILZ-FREE",
    KEY_PREFIX_PREM: "VRILZ-PREM",
    KEY_PREFIX_VIP: "VRILZ-VIP",
    KEY_PREFIX_LIFE: "VRILZ-LIFE",
    FREE_UNREDEEMED_MINUTES: 30,
    FREE_REDEEMED_HOURS: 24,
    PREM_DURATION_DAYS: 30,
    VIP_DURATION_DAYS: 90,
    COOLDOWN_HOURS: 24,
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

function generateKey(prefix, segments = 3) {
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

async function handleGenerateFree(request, env) {
    const body = await request.json();
    const username = (body.username || "").trim();

    if (!username) return json({ valid: false, reason: "Username required" }, 400);
    if (username.length < 3 || username.length > 20) {
        return json({ valid: false, reason: "Username 3-20 karakter" }, 400);
    }

    const userId = username.toLowerCase();
    const now = Date.now();

    const userData = await env.DB.prepare(
        "SELECT * FROM user_keys WHERE user_id = ?"
    ).bind(userId).first();

    if (userData) {
        const lastClaim = userData.last_claim || 0;
        const cooldownMs = CONFIG.COOLDOWN_HOURS * 3600 * 1000;
        const nextClaim = lastClaim + cooldownMs;

        if (now < nextClaim) {
            const remaining = nextClaim - now;
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return json({
                valid: false,
                reason: `Cooldown! Coba lagi dalam ${hours} jam ${minutes} menit`,
                cooldown_until: nextClaim,
            });
        }

        const oldKey = await env.DB.prepare(
            "SELECT * FROM keys WHERE key = ?"
        ).bind(userData.key).first();

        if (oldKey && oldKey.expires_at > now) {
            return json({
                valid: true,
                key: oldKey.key,
                type: oldKey.type,
                expires: oldKey.expires_at,
                reused: true,
            });
        }
    }

    const key = generateKey(CONFIG.KEY_PREFIX_FREE);
    const expiresAt = now + CONFIG.FREE_UNREDEEMED_MINUTES * 60 * 1000;

    await env.DB.prepare(
        "INSERT INTO keys (key, type, user_id, username, created_at, expires_at, claimed_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(key, "free", userId, username, now, expiresAt, now).run();

    await env.DB.prepare(
        "INSERT OR REPLACE INTO user_keys (user_id, key, created_at, last_claim) VALUES (?, ?, ?, ?)"
    ).bind(userId, key, now, now).run();

    return json({
        valid: true,
        key,
        type: "free",
        expires: expiresAt,
        unredeemed: true,
    });
}

async function handleRedeem(request, env) {
    const body = await request.json();
    const key = (body.key || "").trim();
    const hwid = (body.hwid || "").trim();

    if (!key) return json({ valid: false, reason: "Key required" }, 400);
    if (!hwid) return json({ valid: false, reason: "HWID required" }, 400);

    const now = Date.now();
    const keyData = await env.DB.prepare("SELECT * FROM keys WHERE key = ?").bind(key).first();

    if (!keyData) return json({ valid: false, reason: "Key tidak ditemukan" });
    if (keyData.expires_at !== null && keyData.expires_at < now) {
        return json({ valid: false, reason: "Key expired" });
    }
    if (keyData.hwid && keyData.hwid !== hwid) {
        return json({ valid: false, reason: "Key terikat ke device lain" });
    }

    if (!keyData.redeemed_at) {
        let newExpires;
        if (keyData.type === "free") newExpires = now + CONFIG.FREE_REDEEMED_HOURS * 3600 * 1000;
        else if (keyData.type === "premium") newExpires = now + CONFIG.PREM_DURATION_DAYS * 86400 * 1000;
        else if (keyData.type === "vip") newExpires = now + CONFIG.VIP_DURATION_DAYS * 86400 * 1000;
        else if (keyData.type === "lifetime") newExpires = null;
        else newExpires = now + 86400 * 1000;

        await env.DB.prepare(
            "UPDATE keys SET redeemed_at = ?, expires_at = ?, hwid = ? WHERE key = ?"
        ).bind(now, newExpires, hwid, key).run();

        return json({
            valid: true,
            type: keyData.type,
            expires: newExpires || "lifetime",
            username: keyData.username,
            redeemed: true,
        });
    }

    return json({
        valid: true,
        type: keyData.type,
        expires: keyData.expires_at || "lifetime",
        username: keyData.username,
    });
}

async function handleValidate(request, env) {
    const body = await request.json();
    const key = (body.key || "").trim();
    if (!key) return json({ valid: false, reason: "Key required" }, 400);

    const keyData = await env.DB.prepare("SELECT * FROM keys WHERE key = ?").bind(key).first();
    if (!keyData) return json({ valid: false, reason: "Key tidak ditemukan" });

    const now = Date.now();
    if (keyData.expires_at !== null && keyData.expires_at < now) {
        return json({ valid: false, reason: "Key expired" });
    }

    return json({
        valid: true,
        type: keyData.type,
        expires: keyData.expires_at || "lifetime",
        username: keyData.username,
        redeemed: !!keyData.redeemed_at,
    });
}

async function handleAdminLogin(request, env) {
    const body = await request.json();
    if (body.username === CONFIG.ADMIN_USER && body.password === CONFIG.ADMIN_PASS) {
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

async function verifyAdmin(token, env) {
    return await env.DB.prepare(
        "SELECT * FROM admin_tokens WHERE token = ? AND expires_at > ?"
    ).bind(token, Date.now()).first();
}

async function handleAdminCreate(request, env) {
    const body = await request.json();
    const tokenData = await verifyAdmin(body.token, env);
    if (!tokenData) return json({ valid: false, reason: "Token invalid" }, 401);

    const type = body.type;
    let prefix;
    if (type === "premium") prefix = CONFIG.KEY_PREFIX_PREM;
    else if (type === "vip") prefix = CONFIG.KEY_PREFIX_VIP;
    else if (type === "lifetime") prefix = CONFIG.KEY_PREFIX_LIFE;
    else return json({ valid: false, reason: "Type invalid" }, 400);

    const key = generateKey(prefix);
    const now = Date.now();
    let expiresAt;
    if (type === "premium") expiresAt = now + CONFIG.PREM_DURATION_DAYS * 86400 * 1000;
    else if (type === "vip") expiresAt = now + CONFIG.VIP_DURATION_DAYS * 86400 * 1000;
    else expiresAt = null;

    await env.DB.prepare(
        "INSERT INTO keys (key, type, created_at, expires_at, note) VALUES (?, ?, ?, ?, ?)"
    ).bind(key, type, now, expiresAt, body.note || "").run();

    return json({ valid: true, key, type, expires: expiresAt || "lifetime" });
}

async function handleAdminList(request, env) {
    const body = await request.json();
    const tokenData = await verifyAdmin(body.token, env);
    if (!tokenData) return json({ valid: false, reason: "Token invalid" }, 401);

    const result = await env.DB.prepare(
        "SELECT * FROM keys ORDER BY created_at DESC LIMIT 100"
    ).all();

    return json({ valid: true, keys: result.results || [] });
}

async function handleAdminDelete(request, env) {
    const body = await request.json();
    const tokenData = await verifyAdmin(body.token, env);
    if (!tokenData) return json({ valid: false, reason: "Token invalid" }, 401);

    await env.DB.prepare("DELETE FROM keys WHERE key = ?").bind(body.key).run();
    return json({ valid: true });
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === "/api/generate" && request.method === "POST") return await handleGenerateFree(request, env);
            if (path === "/api/redeem" && request.method === "POST") return await handleRedeem(request, env);
            if (path === "/api/validate" && request.method === "POST") return await handleValidate(request, env);
            if (path === "/api/admin/login" && request.method === "POST") return await handleAdminLogin(request, env);
            if (path === "/api/admin/create" && request.method === "POST") return await handleAdminCreate(request, env);
            if (path === "/api/admin/list" && request.method === "POST") return await handleAdminList(request, env);
            if (path === "/api/admin/delete" && request.method === "POST") return await handleAdminDelete(request, env);

            return json({ valid: false, reason: "Not found" }, 404);
        } catch (err) {
            return json({ valid: false, reason: err.message }, 500);
        }
    },
};
