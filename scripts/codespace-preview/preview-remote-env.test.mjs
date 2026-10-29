import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fetchRemoteEnv } from './preview-remote-env.mjs';

const URL_SECRET = 'https://n8n.example/webhook/preview-env';
const PASSWORD = 's3cret-password';

const jsonResponse = (body, status = 200) => ({
	ok: status >= 200 && status < 300,
	status,
	json: async () => body,
});

// Records every call, answers from a queue, repeats the last answer when drained.
function stubFetch(...responses) {
	const calls = [];
	const fetchImpl = async (url, init) => {
		calls.push({ url, init });
		const next = responses.length > 1 ? responses.shift() : responses[0];
		if (next instanceof Error) throw next;
		return next;
	};
	fetchImpl.calls = calls;
	return fetchImpl;
}

// Every test that retries uses these, so the suite never waits on a real clock.
const fast = { timeoutMs: 50, intervalMs: 1 };

describe('fetchRemoteEnv', () => {
	it('does nothing when the webhook is not configured', async () => {
		const fetchImpl = stubFetch(jsonResponse({ N8N_LOG_LEVEL: 'debug' }));

		assert.deepEqual(await fetchRemoteEnv({ fetchImpl }), { env: [], warnings: [] });
		assert.equal(fetchImpl.calls.length, 0);
	});

	it('warns and does not call the webhook when the password is missing', async () => {
		const fetchImpl = stubFetch(jsonResponse({ N8N_LOG_LEVEL: 'debug' }));

		const { env, warnings } = await fetchRemoteEnv({ url: URL_SECRET, fetchImpl });

		assert.deepEqual(env, []);
		assert.equal(warnings.length, 1);
		assert.equal(fetchImpl.calls.length, 0);
	});

	it('turns the response into KEY=VALUE pairs', async () => {
		const fetchImpl = stubFetch(
			jsonResponse({ N8N_LOG_LEVEL: 'debug', N8N_PORT: 5679, N8N_METRICS: true }),
		);

		const { env, warnings } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
		});

		assert.deepEqual(env, ['N8N_LOG_LEVEL=debug', 'N8N_PORT=5679', 'N8N_METRICS=true']);
		assert.deepEqual(warnings, []);
	});

	it('sends basic auth and the PR context', async () => {
		const fetchImpl = stubFetch(jsonResponse({}));

		await fetchRemoteEnv({
			url: URL_SECRET,
			user: 'bot',
			password: PASSWORD,
			pr: '1234',
			fetchImpl,
		});

		const [{ url, init }] = fetchImpl.calls;
		assert.equal(url.searchParams.get('pr'), '1234');
		assert.equal(
			init.headers.authorization,
			`Basic ${Buffer.from(`bot:${PASSWORD}`).toString('base64')}`,
		);
	});

	it('defaults the basic auth user', async () => {
		const fetchImpl = stubFetch(jsonResponse({}));

		await fetchRemoteEnv({ url: URL_SECRET, password: PASSWORD, fetchImpl });

		assert.equal(
			fetchImpl.calls[0].init.headers.authorization,
			`Basic ${Buffer.from(`preview:${PASSWORD}`).toString('base64')}`,
		);
	});

	// A rejected credential never fixes itself, so retrying it for the whole
	// window only delays the preview and hammers the webhook.
	it('gives up immediately on a rejected credential', async () => {
		const fetchImpl = stubFetch(jsonResponse({}, 401));

		const { env, warnings } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
			...fast,
		});

		assert.deepEqual(env, []);
		assert.equal(fetchImpl.calls.length, 1);
		assert.match(warnings[0], /HTTP 401/);
	});

	it('retries a 5xx and succeeds', async () => {
		const fetchImpl = stubFetch(jsonResponse({}, 503), jsonResponse({ N8N_LOG_LEVEL: 'debug' }));

		const { env, warnings } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
			...fast,
		});

		assert.deepEqual(env, ['N8N_LOG_LEVEL=debug']);
		assert.deepEqual(warnings, []);
		assert.equal(fetchImpl.calls.length, 2);
	});

	it('retries a network error', async () => {
		const fetchImpl = stubFetch(new Error('fetch failed'), jsonResponse({ N8N_METRICS: 'true' }));

		const { env } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
			...fast,
		});

		assert.deepEqual(env, ['N8N_METRICS=true']);
	});

	it('serves without remote env when the webhook never answers', async () => {
		const fetchImpl = stubFetch(new Error('fetch failed'));

		const { env, warnings } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
			...fast,
		});

		assert.deepEqual(env, []);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /did not answer/);
	});

	it('drops a key that is not a variable name', async () => {
		const fetchImpl = stubFetch(
			jsonResponse({ 'FOO=BAR': 'x', '2FOO': 'x', 'A\nB': 'x', GOOD_ONE: 'y' }),
		);

		const { env, warnings } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
		});

		assert.deepEqual(env, ['GOOD_ONE=y']);
		assert.equal(warnings.length, 3);
	});

	it('drops a value that is not a scalar', async () => {
		const fetchImpl = stubFetch(
			jsonResponse({ NESTED: { a: 1 }, LIST: [1], EMPTY: null, GOOD_ONE: 'y' }),
		);

		const { env, warnings } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
		});

		assert.deepEqual(env, ['GOOD_ONE=y']);
		assert.equal(warnings.length, 3);
	});

	it('warns on a body that is not an object', async () => {
		for (const body of [['N8N_LOG_LEVEL=debug'], 'debug', null]) {
			const fetchImpl = stubFetch(jsonResponse(body));

			const { env, warnings } = await fetchRemoteEnv({
				url: URL_SECRET,
				password: PASSWORD,
				fetchImpl,
			});

			assert.deepEqual(env, []);
			assert.equal(warnings.length, 1);
		}
	});

	it('warns on a body that is not JSON', async () => {
		const fetchImpl = stubFetch({
			ok: true,
			status: 200,
			json: async () => {
				throw new SyntaxError('Unexpected token < in JSON');
			},
		});

		const { env, warnings } = await fetchRemoteEnv({
			url: URL_SECRET,
			password: PASSWORD,
			fetchImpl,
		});

		assert.deepEqual(env, []);
		assert.match(warnings[0], /valid JSON/);
	});

	it('warns on a URL that does not parse, without quoting it', async () => {
		const fetchImpl = stubFetch(jsonResponse({}));

		const { env, warnings } = await fetchRemoteEnv({
			url: 'not a url',
			password: PASSWORD,
			fetchImpl,
		});

		assert.deepEqual(env, []);
		assert.equal(fetchImpl.calls.length, 0);
		assert.doesNotMatch(warnings[0], /not a url/);
	});

	// The warnings are printed by preview-serve.mjs, which runs in CI output.
	it('never puts a secret or a value in a warning', async () => {
		const fetchImpl = stubFetch(
			jsonResponse({ SECRET_VALUE: 'hunter2', 'BAD KEY': 'hunter2' }, 403),
		);

		const both = await Promise.all([
			fetchRemoteEnv({ url: URL_SECRET, password: PASSWORD, fetchImpl, ...fast }),
			fetchRemoteEnv({
				url: URL_SECRET,
				password: PASSWORD,
				fetchImpl: stubFetch(jsonResponse({ 'BAD KEY': 'hunter2' })),
			}),
		]);

		for (const { warnings } of both)
			for (const warning of warnings) {
				assert.doesNotMatch(warning, /hunter2/);
				assert.doesNotMatch(warning, new RegExp(PASSWORD));
				assert.doesNotMatch(warning, /n8n\.example/);
			}
	});
});
