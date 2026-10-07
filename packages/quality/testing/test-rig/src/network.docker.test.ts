import { network } from './network';
import type { Container } from './process';
import { RigStack } from './stack';

const CONNECT = `const net = require('net');
const started = Date.now();
const socket = net.connect(5432, 'postgres');
socket.on('connect', () => { console.log(Date.now() - started); process.exit(0); });
socket.on('error', () => { console.log('error'); process.exit(0); });
setTimeout(() => { console.log('timeout'); process.exit(0); }, 2000);`;

async function connectMs(container: Container): Promise<string> {
	const { output } = await container.exec(['node', '-e', CONNECT]);
	return output.trim().split('\n').at(-1) ?? '';
}

describe('network faults', () => {
	it('delays, cuts and restores the link from main to Postgres', async () => {
		const rig = await RigStack.start({
			name: 'network',
			workers: 0,
			runners: 'internal',
			scale: 1,
		});
		try {
			const main = rig.main();
			const postgres = rig.container(/-postgres$/);
			expect(Number(await connectMs(main))).toBeLessThan(200);

			await network.delay(main, postgres, 400);
			expect(Number(await connectMs(main))).toBeGreaterThanOrEqual(400);

			await network.cut(main, postgres);
			expect(await connectMs(main)).toBe('timeout');

			await network.restore(main);
			expect(Number(await connectMs(main))).toBeLessThan(200);
		} finally {
			await rig.stop();
		}
	});
});
