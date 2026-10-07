import path from 'path';
import { describe, expect, it } from 'vitest';

import {
	CLOUD_INSTANCE,
	LOCAL_INSTANCE,
	SPEC_DIR,
	assertNodeVersion,
	baseInstanceEnv,
	buildInstanceEnv,
	buildPlaywrightArgs,
	buildPlaywrightEnv,
	cloudEnv,
	instanceUrl,
	localAssistantEnv,
	parseExtraEnv,
	parsePort,
	pathWithNode,
	resolveNodeBin,
	tailLines,
} from './local-linked-config.mjs';

describe('instances', () => {
	it('puts "This computer" on localhost and "Cloud" on 127.0.0.1, with separate ports', () => {
		expect(instanceUrl(LOCAL_INSTANCE)).toBe('http://localhost:5678');
		expect(instanceUrl(CLOUD_INSTANCE)).toBe('http://127.0.0.1:5680');
		expect([LOCAL_INSTANCE.brokerPort, CLOUD_INSTANCE.brokerPort]).toEqual([5690, 5691]);
	});

	it('names the instances "local" and "cloud", for their folders and logs', () => {
		expect([LOCAL_INSTANCE.name, CLOUD_INSTANCE.name]).toEqual(['local', 'cloud']);
	});

	it('cannot be changed by a caller', () => {
		expect(Object.isFrozen(LOCAL_INSTANCE)).toBe(true);
		expect(Object.isFrozen(CLOUD_INSTANCE)).toBe(true);
	});
});

describe('parsePort', () => {
	it.each([undefined, '', '   '])('uses the fallback for %j', (raw) => {
		expect(parsePort(raw, 5799, 'SCRIPTED_LLM_PORT')).toBe(5799);
	});

	it.each([
		['1', 1],
		['4010', 4010],
		[' 65535 ', 65535],
	])('reads %j as %i', (raw, port) => {
		expect(parsePort(raw, 5799, 'SCRIPTED_LLM_PORT')).toBe(port);
	});

	it.each(['0', '65536', '-1', '12.5', '0x10', '1e3', 'abc', '123456'])(
		'rejects %j and names the variable',
		(raw) => {
			expect(() => parsePort(raw, 5799, 'SCRIPTED_LLM_PORT')).toThrow(
				`SCRIPTED_LLM_PORT must be a TCP port from 1 to 65535, got "${raw}"`,
			);
		},
	);
});

describe('parseExtraEnv', () => {
	it.each([undefined, '', '  '])('returns no variables for %j', (raw) => {
		expect(parseExtraEnv(raw, 'N8N_TEST_ENV_LOCAL')).toEqual({});
	});

	it('turns numbers and booleans into strings', () => {
		expect(parseExtraEnv('{"N8N_A":"x","N8N_B":5,"N8N_C":false}', 'N8N_TEST_ENV_CLOUD')).toEqual({
			N8N_A: 'x',
			N8N_B: '5',
			N8N_C: 'false',
		});
	});

	it('rejects text that is not JSON', () => {
		expect(() => parseExtraEnv('{N8N_A:1}', 'N8N_TEST_ENV_LOCAL')).toThrow(
			'N8N_TEST_ENV_LOCAL is not valid JSON',
		);
	});

	it.each(['[]', '"text"', '42', 'null', '{"N8N_A":{"nested":true}}', '{"N8N_A":null}'])(
		'rejects JSON %s that is not a flat object',
		(raw) => {
			expect(() => parseExtraEnv(raw, 'N8N_TEST_ENV_CLOUD')).toThrow(
				'N8N_TEST_ENV_CLOUD must be a JSON object of string, number or boolean values',
			);
		},
	);
});

describe('resolveNodeBin', () => {
	it('uses N8N_NODE_BIN without surrounding spaces', () => {
		expect(resolveNodeBin({ N8N_NODE_BIN: ' /opt/node24/bin/node ' })).toBe('/opt/node24/bin/node');
	});

	it.each([{}, { N8N_NODE_BIN: '' }, { N8N_NODE_BIN: '  ' }])('uses node on PATH for %j', (env) => {
		expect(resolveNodeBin(env)).toBe('node');
	});
});

describe('assertNodeVersion', () => {
	it.each(['24.0.0', '24.21.0\n', ' 25.1.0', '30.0.0'])('accepts %j', (version) => {
		expect(() => assertNodeVersion(version, 'node')).not.toThrow();
	});

	it.each(['22.22.0\n', '23.9.9', 'v24.0.0', 'garbage', ''])('rejects %j', (version) => {
		expect(() => assertNodeVersion(version, '/usr/bin/node')).toThrow(
			`n8n needs Node.js 24 or later, but "/usr/bin/node" is "${version.trim()}". ` +
				'Set N8N_NODE_BIN to the path of a Node.js 24 binary.',
		);
	});
});

describe('pathWithNode', () => {
	const nodeBin = path.join(path.sep, 'opt', 'node24', 'bin', 'node');
	const nodeDir = path.dirname(nodeBin);

	it('puts the directory of the binary first', () => {
		expect(pathWithNode(`/usr/bin${path.delimiter}/bin`, nodeBin)).toBe(
			`${nodeDir}${path.delimiter}/usr/bin${path.delimiter}/bin`,
		);
	});

	it('uses only the directory when PATH is empty', () => {
		expect(pathWithNode(undefined, nodeBin)).toBe(nodeDir);
		expect(pathWithNode('', nodeBin)).toBe(nodeDir);
	});

	it('makes a relative binary path absolute', () => {
		const relative = path.join('tools', 'bin', 'node');
		expect(pathWithNode('/usr/bin', relative)).toBe(
			`${path.resolve('tools', 'bin')}${path.delimiter}/usr/bin`,
		);
	});

	it('keeps PATH when the binary is a bare command name', () => {
		expect(pathWithNode('/usr/bin', 'node')).toBe('/usr/bin');
		expect(pathWithNode(undefined, 'node')).toBeUndefined();
	});
});

describe('baseInstanceEnv', () => {
	it('gives each instance its own ports and user folder, in e2e mode', () => {
		expect(baseInstanceEnv(CLOUD_INSTANCE, '/tmp/cloud')).toEqual({
			E2E_TESTS: 'true',
			N8N_LISTEN_ADDRESS: '127.0.0.1',
			PREBUILDS_ONLY: '1',
			N8N_PORT: '5680',
			N8N_RUNNERS_BROKER_PORT: '5691',
			N8N_USER_FOLDER: '/tmp/cloud',
			N8N_LOG_LEVEL: 'warn',
			N8N_RESTRICT_FILE_ACCESS_TO: '',
		});
	});
});

describe('localAssistantEnv', () => {
	it('points the Assistant at the scripted LLM with /v1 and at the fake sandbox', () => {
		const env = localAssistantEnv({ llmPort: 4010, sandboxPort: 4011 });

		expect(env).toMatchObject({
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-scripted',
			N8N_INSTANCE_AI_MODEL_URL: 'http://127.0.0.1:4010/v1',
			N8N_INSTANCE_AI_MODEL_API_KEY: 'scripted',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'n8n-sandbox',
			N8N_SANDBOX_SERVICE_URL: 'http://127.0.0.1:4011',
			N8N_EXPERIENCE_MODES_ENABLED: 'true',
			N8N_SSRF_ALLOWED_IP_RANGES: '127.0.0.1/32',
		});
	});
});

describe('cloudEnv', () => {
	it('turns off the MCP rate limit and the secure cookie', () => {
		expect(cloudEnv()).toEqual({ N8N_MCP_SERVER_RATE_LIMIT: '0', N8N_SECURE_COOKIE: 'false' });
	});
});

describe('buildInstanceEnv', () => {
	const nodeBin = path.join(path.sep, 'opt', 'node24', 'bin', 'node');

	it('layers parent env, instance env and caller env, and puts Node.js on PATH', () => {
		const env = buildInstanceEnv({
			parentEnv: { PATH: '/usr/bin', HOME: '/root', N8N_PORT: '1111', N8N_LOG_LEVEL: 'debug' },
			nodeBin,
			instanceEnv: { N8N_PORT: '5678', N8N_LOG_LEVEL: 'warn' },
			extraEnv: { N8N_LOG_LEVEL: 'info' },
		});

		expect(env).toEqual({
			PATH: `${path.dirname(nodeBin)}${path.delimiter}/usr/bin`,
			HOME: '/root',
			N8N_PORT: '5678',
			N8N_LOG_LEVEL: 'info',
		});
	});

	it('lets the caller env override PATH too', () => {
		const env = buildInstanceEnv({
			parentEnv: { PATH: '/usr/bin' },
			nodeBin,
			instanceEnv: {},
			extraEnv: { PATH: '/custom' },
		});

		expect(env.PATH).toBe('/custom');
	});

	it('does not add PATH when the parent has none and the binary is on PATH', () => {
		const env = buildInstanceEnv({ parentEnv: {}, nodeBin: 'node', instanceEnv: {}, extraEnv: {} });

		expect(env).toEqual({});
		expect('PATH' in env).toBe(false);
	});
});

describe('buildPlaywrightArgs', () => {
	const base = ['exec', 'playwright', 'test', '--project=e2e'];

	it('runs the spec folder with one worker by default', () => {
		expect(SPEC_DIR).toBe('tests/e2e/future-poc');
		expect(buildPlaywrightArgs([])).toEqual([...base, SPEC_DIR, '--workers=1']);
	});

	it('passes other arguments after the defaults', () => {
		expect(buildPlaywrightArgs(['--grep', 'smoke', '--headed'])).toEqual([
			...base,
			SPEC_DIR,
			'--workers=1',
			'--grep',
			'smoke',
			'--headed',
		]);
	});

	it.each([['tests/e2e/future-poc/smoke.spec.ts'], ['smoke.spec.ts'], ['tests/e2e/other']])(
		'replaces the spec folder with the explicit path %s',
		(specPath) => {
			expect(buildPlaywrightArgs([specPath])).toEqual([...base, '--workers=1', specPath]);
		},
	);
});

describe('buildPlaywrightEnv', () => {
	it('tells Playwright both URLs and ports, and not to start n8n itself', () => {
		const env = buildPlaywrightEnv(
			{ PLAYWRIGHT_BROWSERS_PATH: '/browsers', N8N_BASE_URL: 'http://localhost:9999' },
			{ llmPort: 4010, sandboxPort: 4011 },
		);

		expect(env).toEqual({
			PLAYWRIGHT_BROWSERS_PATH: '/browsers',
			N8N_BASE_URL: 'http://localhost:5678',
			CLOUD_BASE_URL: 'http://127.0.0.1:5680',
			SCRIPTED_LLM_PORT: '4010',
			SANDBOX_SERVICE_PORT: '4011',
			PLAYWRIGHT_SKIP_WEBSERVER: 'true',
			PLAYWRIGHT_ALLOW_CONTAINER_ONLY: 'true',
		});
	});
});

describe('tailLines', () => {
	it('returns the last lines without the trailing newlines', () => {
		expect(tailLines('a\nb\nc\nd\n\n', 2)).toBe('c\nd');
	});

	it('returns the whole text when it is shorter than the limit', () => {
		expect(tailLines('a\nb', 5)).toBe('a\nb');
	});

	it('returns an empty string for an empty log', () => {
		expect(tailLines('', 3)).toBe('');
	});
});
