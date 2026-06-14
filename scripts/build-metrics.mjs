#!/usr/bin/env node
// @ts-check
/**
 * Extracts machine-readable build metrics from a buildx build, so build time,
 * docker layer cache-hit ratio, turbo cache-hit count, and image size stay
 * measurable across the docker-build consolidation (DEVP-262).
 *
 *   docker buildx bake n8n --metadata-file meta.json --progress=rawjson | tee build.jsonl
 *   node scripts/build-metrics.mjs build.jsonl meta.json n8nio/n8n:local
 *
 * Writes docker-build-metrics.json and prints a summary. Sources, per the
 * research: --progress=rawjson for per-vertex timing + `cached`; the turbo
 * `Cached: N cached, M total` COUNT (never the label) from the build step's
 * log stream; --metadata-file for the image digest; `docker image inspect`
 * for local size.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [, , rawjsonPath, metaPath, imageTag] = process.argv;
if (!rawjsonPath) {
	console.error('usage: build-metrics.mjs <build.jsonl> [meta.json] [imageTag]');
	process.exit(1);
}

/** @type {Map<string, {name: string, started?: number, completed?: number, cached: boolean}>} */
const vertices = new Map();
/** @type {Map<string, string>} decoded log text per vertex digest */
const logs = new Map();

const ms = (t) => (t ? new Date(t).getTime() : undefined);

for (const line of readFileSync(rawjsonPath, 'utf8').split('\n')) {
	if (!line.trim()) continue;
	let ev;
	try {
		ev = JSON.parse(line);
	} catch {
		continue; // non-json progress noise
	}
	for (const v of ev.vertexes ?? []) {
		const prev = vertices.get(v.digest) ?? { name: v.name, cached: false };
		vertices.set(v.digest, {
			name: v.name ?? prev.name,
			started: ms(v.started) ?? prev.started,
			completed: ms(v.completed) ?? prev.completed,
			cached: v.cached ?? prev.cached,
		});
	}
	for (const l of ev.logs ?? []) {
		const text = Buffer.from(l.data ?? '', 'base64').toString('utf8');
		logs.set(l.vertex, (logs.get(l.vertex) ?? '') + text);
	}
}

const done = [...vertices.values()].filter((v) => v.completed && v.started);
const starts = done.map((v) => v.started).filter((n) => n !== undefined);
const ends = done.map((v) => v.completed).filter((n) => n !== undefined);
const totalMs = starts.length ? Math.max(...ends) - Math.min(...starts) : 0;

const all = [...vertices.values()];
const cachedCount = all.filter((v) => v.cached).length;
const layerCacheHitPct = all.length ? Math.round((cachedCount / all.length) * 1000) / 10 : 0;

// Turbo: parse the COUNT from `Cached:  N cached, M total` in any step's logs.
let turbo = null;
for (const text of logs.values()) {
	const m = text.match(/Cached:\s+(\d+) cached,\s+(\d+) total/);
	if (m) {
		turbo = { cached: Number(m[1]), total: Number(m[2]), fullTurbo: /FULL TURBO/.test(text) };
		break;
	}
}

let digest;
if (metaPath) {
	try {
		const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
		// bake writes a per-target map; build writes a flat object.
		const node = meta['containerimage.digest'] ? meta : Object.values(meta)[0];
		digest = node?.['containerimage.digest'];
	} catch {
		/* optional */
	}
}

// `docker images` reports the real size; `docker image inspect .Size` misreads
// a --load'd OCI index (with attestations) and undercounts. Parse the human size.
let sizeMB = null;
if (imageTag) {
	try {
		const human = execFileSync('docker', ['images', imageTag, '--format', '{{.Size}}'], {
			encoding: 'utf8',
		})
			.trim()
			.split('\n')[0];
		const m = human.match(/^([\d.]+)\s*([A-Za-z]+)/);
		if (m) {
			const mult =
				{ B: 1e-6, KB: 1e-3, KIB: 1e-3, MB: 1, MIB: 1, GB: 1e3, GIB: 1e3, TB: 1e6 }[
					m[2].toUpperCase()
				] ?? 1;
			sizeMB = Math.round(parseFloat(m[1]) * mult * 10) / 10;
		}
	} catch {
		/* image not loaded locally */
	}
}

const slowest = done
	.map((v) => ({ name: v.name, sec: Math.round((v.completed - v.started) / 100) / 10 }))
	.sort((a, b) => b.sec - a.sec)
	.slice(0, 6);

const metrics = {
	totalBuildSec: Math.round(totalMs / 100) / 10,
	dockerLayerCacheHitPct: layerCacheHitPct,
	dockerStepsCachedOfTotal: `${cachedCount}/${all.length}`,
	turbo, // {cached, total, fullTurbo} | null (null = no turbo step in this build, e.g. D1)
	imageSizeMB: sizeMB,
	digest: digest ?? null,
	slowestSteps: slowest,
};

writeFileSync('docker-build-metrics.json', JSON.stringify(metrics, null, 2) + '\n');

const log = (m) => process.stderr.write(m + '\n');
log('=== docker build metrics ===');
log(`total build:        ${metrics.totalBuildSec}s`);
log(`layer cache hit:    ${metrics.dockerLayerCacheHitPct}% (${metrics.dockerStepsCachedOfTotal} steps)`);
log(`turbo cache:        ${turbo ? `${turbo.cached}/${turbo.total}${turbo.fullTurbo ? ' FULL TURBO' : ''}` : 'n/a (no in-build turbo step)'}`);
log(`image size:         ${metrics.imageSizeMB ? metrics.imageSizeMB + 'MB' : 'n/a (not loaded)'}`);
log(`slowest: ${slowest.map((s) => `${s.name?.slice(0, 28)}=${s.sec}s`).join('  ')}`);
log('→ docker-build-metrics.json');
