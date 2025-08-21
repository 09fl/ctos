function hash16(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
    }
    return hash & 65535;
}

// GET /api/counter
async function GetCounter(request, env) {
    const KV_counter = env.KV_counter;
    if (!KV_counter) {
        return new Response('???????');
    }
    let current = await KV_counter.get('counter');
    if (current == null) {
        current = 0;
    }
    const clientHash = hash16(request.headers.get('CF-Connecting-IP') || 0);
    let lastAccess = await KV_counter.get(clientHash);
    if (lastAccess == null) {
        lastAccess = 0;
    }
    const now = Date.now();
    if (now - lastAccess >= 86400 * 1000) {
        current++;
        await KV_counter.put('counter', current);
        await KV_counter.put(clientHash, now);
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
