import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { Container } from './process';
import { docker } from './process';

const run = promisify(execFile);

export const NETEM_IMAGE = 'n8n-test-rig/netem:1';
const NETEM_DOCKERFILE = 'FROM alpine:3.20\nRUN apk add --no-cache iproute2\n';

export type LinkFault = { delayMs: number } | { cut: true };

/**
 * tc commands that apply one fault to the traffic a container sends to one IP,
 * on the interface that routes to it. Other traffic goes through the default band untouched.
 */
export function netemCommands(ip: string, fault: LinkFault): string[] {
	if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) throw new Error(`not an IPv4 address: ${ip}`);
	const netem = 'cut' in fault ? 'loss 100%' : `delay ${Math.max(1, Math.round(fault.delayMs))}ms`;
	return [
		`DEV=$(ip -o route get ${ip} | sed -n 's/.* dev \\([^ ]*\\).*/\\1/p')`,
		'tc qdisc del dev $DEV root 2>/dev/null || true',
		'tc qdisc add dev $DEV root handle 1: prio',
		`tc qdisc add dev $DEV parent 1:3 handle 30: netem ${netem}`,
		`tc filter add dev $DEV protocol ip parent 1:0 prio 3 u32 match ip dst ${ip}/32 flowid 1:3`,
	];
}

async function ensureNetemImage() {
	try {
		await docker('image', 'inspect', NETEM_IMAGE);
	} catch {
		const build = run('docker', ['build', '-q', '-t', NETEM_IMAGE, '-']);
		build.child.stdin?.end(NETEM_DOCKERFILE);
		await build;
	}
}

/** Runs shell commands in the network namespace of a container, from a short-lived sidecar. */
async function inNetwork(container: Container, commands: string[]) {
	await ensureNetemImage();
	await docker(
		'run',
		'--rm',
		'--net',
		`container:${container.getId()}`,
		'--cap-add',
		'NET_ADMIN',
		NETEM_IMAGE,
		'sh',
		'-c',
		commands.join(' && '),
	);
}

async function networksOf(container: Container): Promise<Record<string, { IPAddress: string }>> {
	const json = await docker(
		'inspect',
		'--format',
		'{{json .NetworkSettings.Networks}}',
		container.getId(),
	);
	return JSON.parse(json) as Record<string, { IPAddress: string }>;
}

/** The IP address of `to` on a network it shares with `from`. */
export async function ipOn(from: Container, to: Container): Promise<string> {
	const [mine, theirs] = await Promise.all([networksOf(from), networksOf(to)]);
	const shared = Object.keys(theirs).find((name) => name in mine && theirs[name].IPAddress);
	if (!shared) throw new Error(`${from.getName()} and ${to.getName()} share no network`);
	return theirs[shared].IPAddress;
}

/**
 * Faults on the link from one container to another, through netem in the
 * sender's network namespace. One fault per sender at a time; a new one replaces it.
 */
export const network = {
	async delay(from: Container, to: Container, delayMs: number) {
		await inNetwork(from, netemCommands(await ipOn(from, to), { delayMs }));
	},
	async cut(from: Container, to: Container) {
		await inNetwork(from, netemCommands(await ipOn(from, to), { cut: true }));
	},
	async restore(from: Container) {
		await inNetwork(from, [
			'for dev in $(ls /sys/class/net); do tc qdisc del dev $dev root 2>/dev/null; done; true',
		]);
	},
};
