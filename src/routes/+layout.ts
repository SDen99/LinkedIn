import { dev } from '$app/environment';

if (!import.meta.env.SSR) {
	import('@vercel/analytics/sveltekit').then(({ injectAnalytics }) => {
		injectAnalytics({ mode: dev ? 'development' : 'production' });
	}).catch(() => {});
}

export const ssr = false;
export const prerender = true;
export const csr = true;
