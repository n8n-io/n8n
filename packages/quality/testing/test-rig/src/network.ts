import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { Container } from './process';
import { docker, until } from './process';

const run = promisify(execFile);

const NETEM_IMAGE = 'n8n-test-rig/netem:1';

async function ensureNetemImage() {
	try {
		await docker('image', 'inspect', NETEM_IMAGE);
	} catch {
		const build = run('docker', ['build', '-q', '-t', NETEM_IMAGE, '-']);
		build.child.stdin?.end('FROM alpine:3.20\nRUN apk add --no-cache iproute2\n');
		await build;
	}
}

/** Polls the detached sidecar, because an attached `docker run` can stay open after the container has exited. */
async function inNetwork(container: Container, commands: string[]) {
	await ensureNetemImage();
	const id = await docker(
		'run',
		'-d',
		'--net',
		`container:${container.getId()}`,
		'--cap-add',
		'NET_ADMIN',
		NETEM_IMAGE,
		'sh',
		'-c',
		commands.join(' && '),
	);
	try {
		await until(
			'tc exit',
			async () => {
				const [status, code] = (
					await docker('inspect', '--format', '{{.State.Status}} {{.State.ExitCode}}', id)
				).split(' ');
				if (status !== 'exited' && status !== 'dead') return false;
				if (code !== '0') throw new Error(`tc failed (${code}): ${await docker('logs', id)}`);
				return true;
			},
			30_000,
		);
	} finally {
		await docker('rm', '-f', id).catch(() => undefined);
	}
}

async function networksOf(container: Container): Promise<Record<string, { IPAddress: string }>> {
	return JSON.parse(
		await docker('inspect', '--format', '{{json .NetworkSettings.Networks}}', container.getId()),
	);
}

async function setFault(from: Container, to: Container, netem: string) {
	const [mine, theirs] = await Promise.all([networksOf(from), networksOf(to)]);
	const shared = Object.keys(theirs).find((name) => name in mine && theirs[name].IPAddress);
	if (!shared) throw new Error(`${from.getName()} and ${to.getName()} share no network`);
	const ip = theirs[shared].IPAddress;
	await inNetwork(from, [
		`DEV=$(ip -o route get ${ip} | sed -n 's/.* dev \\([^ ]*\\).*/\\1/p')`,
		'tc qdisc del dev $DEV root 2>/dev/null || true',
		'tc qdisc add dev $DEV root handle 1: prio',
		`tc qdisc add dev $DEV parent 1:3 handle 30: netem ${netem}`,
		`tc filter add dev $DEV protocol ip parent 1:0 prio 3 u32 match ip dst ${ip}/32 flowid 1:3`,
	]);
}

export const network = {
	async delay(from: Container, to: Container, delayMs: number) {
		await setFault(from, to, `delay ${Math.max(1, Math.round(delayMs))}ms`);
	},
	async cut(from: Container, to: Container) {
		await setFault(from, to, 'loss 100%');
	},
	async restore(from: Container) {
		await inNetwork(from, [
			'for dev in $(ls /sys/class/net); do tc qdisc del dev $dev root 2>/dev/null; done; true',
		]);
	},
};
