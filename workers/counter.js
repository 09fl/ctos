import { webcrypto } from 'crypto';

// GET /api/counter
export default async function fetch(request, env, ctx) {
    if (!env.DB_counter) {
        return new Response('???????');
    }
    let current = await env.DB_counter.prepare('SELECT * FROM Count').first('Value') || 0;
    const clientIp = request.headers.get('CF-Connecting-IP') || 0;
    const clientHash = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp));
    const trucHash = new Uint16Array(clientHash)[0].toString(16);
    const lastAccess = await env.DB_counter.prepare('SELECT * FROM History WHERE Key=?').bind(trucHash).first('Timestamp') || 0;
    const now = Date.now();
    if (now - lastAccess >= 86400 * 1000) {
        current++;
        if (current == 1) {
            await env.DB_counter.prepare('INSERT INTO Count VALUES (1)').run();
        } else {
            await env.DB_counter.prepare('UPDATE Count SET Value=?').bind(current).run();
        }
        if (lastAccess == 0) {
            await env.DB_counter.prepare('INSERT INTO History VALUES (?,?)').bind(trucHash, now).run();
        } else {
            await env.DB_counter.prepare('UPDATE History SET Timestamp=? WHERE Key=?').bind(now, trucHash).run();
        }
    }
    return new Response(String(current).padStart(7, '0'));
}
