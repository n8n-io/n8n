import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { isLoopbackHost } from './inspectActivity.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'inspectActivity.mjs');
const PORT = 5788;
const BASE = `http://127.0.0.1:${PORT}`;

/** A database with the columns the viewer reads, and two rows to render. */
function seedDb() {
	const file = join(mkdtempSync(join(tmpdir(), 'inspect-activity-')), 'database.sqlite');
	const db = new DatabaseSync(file);
	db.exec(`CREATE TABLE activity_event (
		id integer PRIMARY KEY NOT NULL,
		category varchar(32) NOT NULL,
		action varchar(64) NOT NULL,
		typeVersion integer NOT NULL DEFAULT 1,
		userId varchar,
		projectId varchar(36),
		resourceType varchar(32),
		resourceId varchar(36),
		resourceName text,
		data text,
		createdAt datetime(3) NOT NULL
	)`);
	const insert = db.prepare(`INSERT INTO activity_event
		(category, action, userId, projectId, resourceType, resourceId, resourceName, data, createdAt)
		VALUES (?, ?, 'u1', 'p1', ?, ?, ?, ?, ?)`);
	insert.run(
		'workflow',
		'created',
		'workflow',
		'w1',
		'[seed] Alpha',
		'{"nodeCount":6}',
		'2026-01-01 00:00:00.000',
	);
	insert.run(
		'credential',
		'created',
		'credential',
		'c1',
		'[seed] 100% Cover',
		null,
		'2026-01-02 00:00:00.000',
	);
	db.close();
	return file;
}

/**
 * `fetch` treats Host as a forbidden header and drops an override silently, which
 * makes the loopback guard untestable through it. node:http sends what it is given.
 */
function request(requestPath, { method = 'GET', headers = {} } = {}) {
	return new Promise((resolve, reject) => {
		const req = http.request(
			{ host: '127.0.0.1', port: PORT, path: requestPath, method, headers },
			(res) => {
				let body = '';
				res.on('data', (c) => (body += c));
				res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
			},
		);
		req.on('error', reject);
		req.end();
	});
}

const get = (requestPath, headers = {}) => request(requestPath, { headers });

describe('isLoopbackHost', () => {
	it('accepts loopback authorities, with or without a port', () => {
		for (const host of [
			'127.0.0.1',
			'127.0.0.1:5699',
			'localhost',
			'LOCALHOST:80',
			'[::1]',
			'[::1]:5699',
			'[0:0:0:0:0:0:0:1]',
		]) {
			assert.equal(isLoopbackHost(host), true, `should accept ${host}`);
		}
	});

	// A prefix match on the bracket accepted `[::1]evil`, so the guard passed a
	// rebinding host straight through to the handler.
	it('rejects hosts that only start with a loopback authority', () => {
		for (const host of [
			'[::1]evil',
			'[::1]evil.com:80',
			'[::1]@evil.com',
			'127.0.0.1.evil.com',
			'127.0.0.1@evil.com',
			'localhost.evil.com',
		]) {
			assert.equal(isLoopbackHost(host), false, `should reject ${host}`);
		}
	});

	it('rejects anything else', () => {
		for (const host of ['evil.com', '[::2]', '[::1]:abc', 'localhost:1:2', '', undefined]) {
			assert.equal(isLoopbackHost(host), false, `should reject ${JSON.stringify(host)}`);
		}
	});
});

describe('inspectActivity server', () => {
	let child;
	let dbFile;

	before(async () => {
		dbFile = seedDb();
		child = spawn(process.execPath, [SCRIPT], {
			env: { ...process.env, DB_SQLITE_DATABASE: dbFile, PORT: String(PORT) },
			stdio: 'ignore',
		});
		for (let i = 0; i < 60; i++) {
			try {
				await get('/');
				return;
			} catch {
				await new Promise((r) => setTimeout(r, 100));
			}
		}
		throw new Error('viewer did not start');
	});

	after(() => child?.kill());

	it('serves the table on a loopback host', async () => {
		const { status, body } = await get('/');
		assert.equal(status, 200);
		assert.match(body, /activity_event/);
		assert.match(body, /2 rows/);
		assert.match(body, /\[seed\] Alpha/);
	});

	it('rejects a non-loopback Host with 403', async () => {
		for (const host of ['evil.example.com', '[::1]evil.com']) {
			const { status } = await get('/', { host });
			assert.equal(status, 403, `expected 403 for Host: ${host}`);
		}
	});

	it('rejects every non-GET method with 405', async () => {
		for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
			const { status, headers } = await request('/', { method });
			assert.equal(status, 405);
			assert.equal(headers.allow, 'GET');
		}
	});

	it('opens the database read-only', () => {
		const ro = new DatabaseSync(dbFile, { readOnly: true });
		assert.throws(() => ro.exec('DELETE FROM activity_event'), /readonly/i);
		ro.close();
	});

	it('filters on the JSON data column', async () => {
		const { body } = await get('/?q=nodeCount');
		assert.match(body, /1 rows?/);
		assert.match(body, /\[seed\] Alpha/);
	});

	it('treats LIKE wildcards in the filter as literals', async () => {
		// `%` unescaped matches every row. Only the row containing it should match.
		const { body } = await get('/?q=%25');
		assert.match(body, /1 rows?/);
		assert.match(body, /100% Cover/);
	});

	it('falls back to a safe sort column instead of interpolating one', async () => {
		const { status } = await get('/?sort=id%3BDROP+TABLE+activity_event--');
		assert.equal(status, 200);
		const check = new DatabaseSync(dbFile, { readOnly: true });
		assert.equal(check.prepare('SELECT COUNT(*) AS n FROM activity_event').get().n, 2);
		check.close();
	});

	it('404s an unknown path', async () => {
		assert.equal((await get('/secrets')).status, 404);
	});
});
