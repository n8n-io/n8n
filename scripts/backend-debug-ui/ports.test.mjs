import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	MAIN_N8N_PORT,
	MAIN_UI_PORT,
	WORKTREE_N8N_BASE,
	WORKTREE_PORT_SPAN,
	WORKTREE_UI_BASE,
	portOffset,
	readPort,
	resolvePorts,
} from './ports.mjs';

describe('resolvePorts', () => {
	it('uses the documented ports for the main checkout', () => {
		const ports = resolvePorts({ kind: 'main', checkoutPath: '/work/n8n', env: {} });
		assert.equal(ports.ui, MAIN_UI_PORT);
		assert.equal(ports.n8n, MAIN_N8N_PORT);
		assert.equal(ports.uiDerived, true);
		assert.equal(ports.n8nDerived, true);
	});

	it('keeps a worktree port stable and inside the worktree range', () => {
		const paths = [
			'/tmp/superset/n8n/alpha',
			'/tmp/superset/n8n/beta',
			'/tmp/superset/n8n/gamma',
			'/worktrees/api-debug',
			'/worktrees/db-layer',
		];
		const slots = paths.map((checkoutPath) => {
			const first = resolvePorts({ kind: 'worktree', checkoutPath, env: {} });
			const second = resolvePorts({ kind: 'worktree', checkoutPath, env: {} });
			assert.deepEqual(first, second);
			assert.ok(first.ui >= WORKTREE_UI_BASE);
			assert.ok(first.ui < WORKTREE_UI_BASE + WORKTREE_PORT_SPAN);
			assert.equal(first.n8n - WORKTREE_N8N_BASE, first.ui - WORKTREE_UI_BASE);
			assert.equal(portOffset(checkoutPath), first.ui - WORKTREE_UI_BASE);
			return first.ui;
		});
		assert.equal(new Set(slots).size, slots.length);
	});

	it('lets env vars override one port at a time', () => {
		const ports = resolvePorts({
			kind: 'worktree',
			checkoutPath: '/tmp/superset/n8n/alpha',
			env: { N8N_PORT: '5699' },
		});
		assert.equal(ports.n8n, 5699);
		assert.equal(ports.n8nDerived, false);
		assert.equal(ports.uiDerived, true);
		assert.notEqual(ports.ui, MAIN_UI_PORT);
	});

	it('rejects a port that is not an integer', () => {
		assert.throws(
			() => readPort('abc', 'N8N_BACKEND_DEBUG_PORT'),
			/N8N_BACKEND_DEBUG_PORT must be an integer/,
		);
		assert.throws(() => readPort('0', 'N8N_PORT'), /N8N_PORT must be an integer/);
		assert.equal(readPort('', 'N8N_PORT'), null);
	});
});
