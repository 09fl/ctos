function hash16(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
    }
    return hash & 65535;
}

export async function onRequestGet(context) {
    const KV_counter = context.env.KV_counter;
    if (!KV_counter) {
        return new Response('???????');
    }
    let current = await KV_counter.get('counter');
    if (current == null) {
        current = 0;
    }
    const headers = context.request.headers;
    const clientHash = headers.has('CF-Connecting-IP') ? hash16(headers.get('CF-Connecting-IP')) : 0;
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
