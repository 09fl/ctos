import getCounter from './counter.js';

const ROUTES = {
    GET: {
        counter: getCounter
    },
    POST: {
    }
}

export default {
    async fetch(request, env, ctx) {
        const route = new URL(request.url).pathname.split('/')[2];
        if (ROUTES[request.method] && ROUTES[request.method][route]) {
            return ROUTES[request.method][route](request, env, ctx);
        }

        return new Response('Not Found', { status: 404 });
    }
};
