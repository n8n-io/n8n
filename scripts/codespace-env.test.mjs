import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { codespaceEnv, codespaceName, forwardingDomain } from './codespace-env.mjs';

const NAME = 'psychic-umbrella-wqj9pvw9p939vp6';

function shared(files) {
	const dir = mkdtempSync(join(tmpdir(), 'codespace-env-'));
	for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content);
	return dir;
}

const originalEnv = { ...process.env };
after(() => {
	process.env = originalEnv;
});

describe('codespaceEnv', () => {
	it('prefers a non-empty env value', () => {
		process.env.CODESPACE_NAME = NAME;
		const dir = shared({ '.env': 'CODESPACE_NAME=from-file\n' });
		assert.equal(codespaceName(dir), NAME);
	});

	// The bug this helper exists for: compose injects an empty value and tmux keeps it.
	it('treats an empty env value as missing', () => {
		process.env.CODESPACE_NAME = '';
		const dir = shared({ 'environment-variables.json': JSON.stringify({ CODESPACE_NAME: NAME }) });
		assert.equal(codespaceName(dir), NAME);
	});

	it('falls back to .env when the JSON has no such key', () => {
		process.env.CODESPACE_NAME = '';
		const dir = shared({
			'environment-variables.json': JSON.stringify({ ACTION_NAME: 'createFromPrebuild' }),
			'.env': `CODESPACE_NAME=stale\nGITHUB_USER=someone\nCODESPACE_NAME=${NAME}\n`,
		});
		assert.equal(codespaceName(dir), NAME, 'the last line wins, as a shell does');
		assert.equal(codespaceEnv('GITHUB_USER', dir), 'someone');
	});

	it('falls back to .env when the JSON is malformed', () => {
		process.env.CODESPACE_NAME = '';
		const dir = shared({
			'environment-variables.json': '{ not json',
			'.env': `CODESPACE_NAME=${NAME}\n`,
		});
		assert.equal(codespaceName(dir), NAME);
	});

	it('returns undefined off a codespace', () => {
		process.env.CODESPACE_NAME = '';
		assert.equal(codespaceName(shared({})), undefined);
	});

	it('ignores an empty value in .env', () => {
		process.env.CODESPACE_NAME = '';
		assert.equal(codespaceName(shared({ '.env': 'CODESPACE_NAME=\n' })), undefined);
	});
});

describe('forwardingDomain', () => {
	it('reads the domain Codespaces reports', () => {
		process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = '';
		const dir = shared({
			'.env': 'GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=preview.app.github.dev\n',
		});
		assert.equal(forwardingDomain(dir), 'preview.app.github.dev');
	});

	it('defaults to app.github.dev', () => {
		process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = '';
		assert.equal(forwardingDomain(shared({})), 'app.github.dev');
	});
});
