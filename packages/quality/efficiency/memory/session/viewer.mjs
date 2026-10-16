import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { once } from 'node:events';
import { resolve, dirname, basename } from 'node:path';
import { spawn } from 'node:child_process';

import { allocationSites, artifactPath, buildReport, readSession } from './report.mjs';

const assets = new URL('./viewer/', import.meta.url);
const localeFile = new URL('../../../../frontend/@n8n/i18n/src/locales/en.json', import.meta.url);
const vendorAssets = {
	...Object.fromEntries(
		[
			'play--solid-16',
			'square--solid-16',
			'pencil--outline-16',
			'check--outline-16',
			'spinner--outline-16',
		].map((name) => [
			`icons/${name}.svg`,
			[
				new URL(
					`../../../../frontend/@n8n/design-system/src/components/N8nIcon/custom/brand/${name}.svg`,
					import.meta.url,
				),
				'image/svg+xml',
			],
		]),
	),
	'pin.svg': [
		new URL(
			'../../../../frontend/@n8n/design-system/src/components/N8nIcon/custom/node-pin.svg',
			import.meta.url,
		),
		'image/svg+xml',
	],
	'vendor/echarts.js': [
		new URL(import.meta.resolve('echarts/dist/echarts.min.js')),
		'text/javascript',
	],
	'vendor/gridstack.js': [
		new URL(import.meta.resolve('gridstack/dist/gridstack-all.js')),
		'text/javascript',
	],
	'vendor/gridstack.css': [
		new URL(import.meta.resolve('gridstack/dist/gridstack.min.css')),
		'text/css',
	],
};

export function openViewer(url) {
	const command =
		process.platform === 'darwin'
			? 'open'
			: process.platform === 'win32'
				? 'explorer.exe'
				: 'xdg-open';
	const child = spawn(command, [url], { stdio: 'ignore', detached: true });
	child.on('error', () => {});
	child.unref();
}

async function artifactReport(input) {
	const data = JSON.parse(await readFile(input, 'utf8'));
	if (input.endsWith('.heapprofile'))
		return {
			kind: 'heapprofile',
			allocationSites: await allocationSites(data),
			filename: basename(input),
		};
	if (
		!input.endsWith('.heapsnapshot') ||
		!data.snapshot?.meta?.node_fields ||
		!Array.isArray(data.nodes)
	) {
		throw new Error('Open a session.json, .heapprofile, or .heapsnapshot file');
	}
	const fields = data.snapshot.meta.node_fields;
	const nameIndex = fields.indexOf('name');
	const sizeIndex = fields.indexOf('self_size');
	const typeIndex = fields.indexOf('type');
	if ([nameIndex, sizeIndex, typeIndex].includes(-1))
		throw new Error('Invalid heap snapshot fields');
	const groups = new Map();
	for (let i = 0; i < data.nodes.length; i += fields.length) {
		const name = data.strings[data.nodes[i + nameIndex]];
		const type = data.snapshot.meta.node_types[typeIndex][data.nodes[i + typeIndex]];
		const key = JSON.stringify([type, name]);
		const group = groups.get(key) ?? { name, type, count: 0, bytes: 0 };
		group.count++;
		group.bytes += data.nodes[i + sizeIndex];
		groups.set(key, group);
	}
	return {
		kind: 'heapsnapshot',
		filename: basename(input),
		constructors: [...groups.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 50),
	};
}

export async function serveViewer({ input, controls, getStatus }) {
	const token = randomUUID();
	const prefix = `/${token}/`;
	const standalone = input.endsWith('.heapprofile') || input.endsWith('.heapsnapshot');
	const artifact = standalone ? await artifactReport(input) : undefined;
	const translations = JSON.parse(await readFile(localeFile, 'utf8'));
	const strings = Object.fromEntries(
		Object.entries(translations)
			.filter(([key]) => key.startsWith('memoryProfiler.'))
			.map(([key, value]) => [key.slice('memoryProfiler.'.length), value]),
	);
	const server = createServer(async (request, response) => {
		try {
			const url = new URL(request.url, 'http://localhost');
			if (!url.pathname.startsWith(prefix)) {
				response.writeHead(404).end();
				return;
			}
			const route = url.pathname.slice(prefix.length);
			response.setHeader('Cache-Control', 'no-store');
			response.setHeader('X-Content-Type-Options', 'nosniff');
			response.setHeader('Referrer-Policy', 'no-referrer');
			response.setHeader(
				'Content-Security-Policy',
				"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
			);
			const json = (value, status = 200) => {
				response.writeHead(status, { 'Content-Type': 'application/json' });
				response.end(JSON.stringify(value));
			};
			if (request.method === 'GET') {
				if (route === 'api/strings') {
					json(strings);
					return;
				}
				if (route === 'api/status') {
					json(getStatus?.() ?? { phase: 'replay', ready: true });
					return;
				}
				if (route === 'api/report') {
					json({
						...(artifact ?? (await buildReport(input, { timeline: true, verifyArtifacts: false }))),
						live:
							Boolean(controls) &&
							['starting', 'warmup', 'measurement', 'paused'].includes(getStatus?.().phase),
						status: getStatus?.(),
					});
					return;
				}
				if (route === 'api/profile' && !artifact) {
					const { session, directory } = await readSession(input);
					const index = Number(url.searchParams.get('index'));
					if (!Number.isInteger(index) || index < 0 || !session.profiles[index])
						throw new Error('Unknown profile checkpoint');
					const profile = session.profiles[index];
					json(
						profile.locationsFile
							? JSON.parse(await readFile(artifactPath(directory, profile.locationsFile), 'utf8'))
							: (profile.allocationSites ?? []),
					);
					return;
				}
				const types = {
					'': ['index.html', 'text/html'],
					'app.mjs': ['app.mjs', 'text/javascript'],
					'chart.mjs': ['chart.mjs', 'text/javascript'],
					'chart-data.mjs': ['chart-data.mjs', 'text/javascript'],
					'dashboard.mjs': ['dashboard.mjs', 'text/javascript'],
					'preferences.mjs': ['preferences.mjs', 'text/javascript'],
					'style.css': ['style.css', 'text/css'],
				};
				if (Object.hasOwn(vendorAssets, route)) {
					const [file, contentType] = vendorAssets[route];
					response.writeHead(200, { 'Content-Type': contentType });
					response.end(await readFile(file));
					return;
				}
				if (Object.hasOwn(types, route)) {
					const [file, contentType] = types[route];
					response.writeHead(200, { 'Content-Type': contentType });
					response.end(await readFile(new URL(file, assets)));
					return;
				}
				if (route.startsWith('artifact/')) {
					const filename = decodeURIComponent(route.slice('artifact/'.length));
					const report = artifact ?? (await buildReport(input));
					const allowed = artifact
						? [basename(input)]
						: [
								'session.json',
								'summary.json',
								'summary.md',
								report.session.timeline,
								...(report.session.requests ? [report.session.requests] : []),
								...(report.session.requestCounts ? [report.session.requestCounts] : []),
								...report.session.profiles.map((profile) => profile.file),
								...report.session.profiles.map((profile) => profile.locationsFile).filter(Boolean),
								...report.session.snapshots.map((snapshot) => snapshot.file),
							];
					if (!allowed.includes(filename)) {
						response.writeHead(404).end();
						return;
					}
					const file = artifactPath(dirname(resolve(input)), filename);
					const stream = createReadStream(file);
					stream.on('error', () => {
						if (!response.headersSent) response.writeHead(404);
						response.end();
					});
					response.setHeader('Content-Type', 'application/octet-stream');
					stream.pipe(response);
					return;
				}
			}
			if (request.method === 'POST' && route.startsWith('api/') && controls) {
				if (request.headers.origin && request.headers.origin !== origin) {
					json({ error: 'Invalid origin' }, 403);
					return;
				}
				let body = '';
				for await (const chunk of request) {
					body += chunk;
					if (body.length > 4096) throw new Error('Control request is too large');
				}
				const action = route.slice(4);
				if (!Object.hasOwn(controls, action)) {
					json({ error: 'Unknown control' }, 404);
					return;
				}
				json(await controls[action](body ? JSON.parse(body) : {}));
				return;
			}
			json({ error: 'Unknown operation' }, 404);
		} catch (error) {
			if (!response.headersSent) response.writeHead(400, { 'Content-Type': 'application/json' });
			response.end(JSON.stringify({ error: error.message }));
		}
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const origin = `http://localhost:${server.address().port}`;
	return {
		url: `${origin}${prefix}`,
		close: async () => {
			server.closeIdleConnections();
			await new Promise((done) => server.close(done));
		},
	};
}
