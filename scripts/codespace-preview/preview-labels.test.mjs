import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { envForSlugs, previewSlugs } from './preview-labels.mjs';

const labels = (...names) => names.map((name) => ({ name }));
const noSecret = () => undefined;
const withSecret = (value) => (name) => (name === 'N8N_LICENSE_ACTIVATION_KEY' ? value : undefined);

describe('previewSlugs', () => {
	it('keeps preview: labels and strips the prefix', () => {
		assert.deepEqual(
			previewSlugs(labels('codespace-preview', 'preview:enterprise', 'preview:debug', 'bug')),
			['enterprise', 'debug'],
		);
	});

	// The slugs are interpolated into the `gh codespace ssh` command, so this
	// filter is a safety boundary rather than tidiness.
	it('drops a slug that is not a plain lowercase slug', () => {
		assert.deepEqual(
			previewSlugs(
				labels(
					'preview:foo;rm -rf /',
					'preview:$(whoami)',
					'preview:has space',
					'preview:UPPER',
					'preview:',
					'preview:-leading-dash',
				),
			),
			[],
		);
	});

	it('survives missing or malformed input', () => {
		assert.deepEqual(previewSlugs(undefined), []);
		assert.deepEqual(previewSlugs([]), []);
		assert.deepEqual(previewSlugs([{}, { name: null }]), []);
	});

	it('does not treat the trigger label as a toggle', () => {
		assert.deepEqual(previewSlugs(labels('codespace-preview')), []);
	});
});

describe('envForSlugs', () => {
	it('gives an enterprise preview the sandbox tenant and the key', () => {
		const { env, warnings } = envForSlugs(['enterprise'], withSecret('sandbox-key'));

		assert.deepEqual(env, ['N8N_LICENSE_TENANT_ID=1001', 'N8N_LICENSE_ACTIVATION_KEY=sandbox-key']);
		assert.deepEqual(warnings, []);
	});

	// An unlicensed preview is still worth reviewing, so a missing secret warns
	// rather than failing the serve.
	it('warns and stays unlicensed when the secret is absent', () => {
		const { env, warnings } = envForSlugs(['enterprise'], noSecret);

		assert.deepEqual(env, []);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /N8N_LICENSE_ACTIVATION_KEY codespace secret/);
	});

	it('maps debug to the log level', () => {
		assert.deepEqual(envForSlugs(['debug'], noSecret).env, ['N8N_LOG_LEVEL=debug']);
	});

	it('warns about a slug it does not know, and keeps the rest', () => {
		const { env, warnings } = envForSlugs(['debug', 'teleport'], noSecret);

		assert.deepEqual(env, ['N8N_LOG_LEVEL=debug']);
		assert.match(warnings[0], /preview:teleport/);
	});

	it('returns nothing for no slugs', () => {
		assert.deepEqual(envForSlugs([], noSecret), { env: [], warnings: [] });
	});
});
