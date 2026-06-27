import { startPoolServer } from './pool-server';

export default async function globalSetup(): Promise<void> {
	const { port } = await startPoolServer();
	const urls = process.env.EVAL_POOL_BASE_URLS ?? '';
	const cap = process.env.EVAL_POOL_CAP ?? '4';
	console.log(`[eval-pool] sidecar on :${port} | lanes=[${urls}] | cap/lane=${cap}`);
}
