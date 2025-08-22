import { webcrypto } from 'crypto';

// GET /api/counter
async function GetCounter(request, env) {
    const KV_counter = env.KV_counter;
    if (!KV_counter) {
        return new Response('???????');
    }
    let current = await KV_counter.get('counter') || 0;
    const clientIp = request.headers.get('CF-Connecting-IP') || 0;
    const clientHash = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp));
    const trucHash = new Uint16Array(clientHash)[0];
    const lastAccess = await KV_counter.get(trucHash) || 0;
    const now = Date.now();
    if (now - lastAccess >= 86400 * 1000) {
        current++;
        await KV_counter.put('counter', current);
        await KV_counter.put(trucHash, now);
    }
    return new Response(String(current).padStart(7, '0'));
}


const ROUTES = {
    GET: {
        counter: GetCounter
    },
    POST: {
    }
}

export default {
    async fetch(request, env, ctx) {
        const route = new URL(request.url).pathname.split('/')[2];
        if (ROUTES[request.method] && ROUTES[request.method][route]) {
            return ROUTES[request.method][route](request, env);
        }

        return new Response('Not Found', { status: 404 });
    }
};
