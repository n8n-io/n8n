import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AgentsInstanceAiBoundaryRule } from './agents-instance-ai-boundary.rule.js';

describe('AgentsInstanceAiBoundaryRule', () => {
	let rootDir: string;
	const modules = 'packages/cli/src/modules';

	function write(file: string, content: string) {
		const fullPath = path.join(rootDir, file);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-instance-ai-boundary-'));
		write(
			'packages/cli/tsconfig.json',
			JSON.stringify({
				compilerOptions: {
					paths: { '@/*': ['./src/*'], '@agents/*': ['./src/modules/agents/*'] },
				},
			}),
		);
		write(
			'packages/@n8n/agents/package.json',
			JSON.stringify({
				exports: {
					'.': './dist/index.js',
					'./tool': './dist/sdk/tool.js',
					'./sandbox': './dist/workspace/sandbox/index.js',
				},
			}),
		);
	});

	afterEach(() => fs.rmSync(rootDir, { recursive: true, force: true }));

	it.each([
		"import { service } from '../instance-ai/service';",
		"import type { Port } from '@n8n/instance-ai';",
		"export type { Port } from '@n8n/instance-ai/types';",
		"export * from '@/modules/instance-ai/service';",
		"const host = import('../instance-ai/service.js');",
		"type Port = import('@n8n/instance-ai').Port;",
		'const host = import(`../instance-ai/service`);',
		"import '../../../../@n8n/instance-ai/src/index';",
	])('rejects reverse dependencies: %s', (source) => {
		write(`${modules}/agents/example.ts`, source);
		expect(new AgentsInstanceAiBoundaryRule().analyze({ rootDir })).toEqual([
			expect.objectContaining({
				line: 1,
				message: expect.stringContaining('Agents must not depend on Instance AI'),
			}),
		]);
	});

	it.each([
		"import type { Agent } from '../agents/entities/agent.entity';",
		"export { service } from '@/modules/agents/agents.service';",
		"const domain = import('@agents/agents.service');",
		"type Service = import('../agents/agents.service').Service;",
		"import { Agent } from '@n8n/agents/src/private';",
		"export { Agent } from '../../../../@n8n/agents/src/index';",
	])('rejects private Agent imports: %s', (source) => {
		write(`${modules}/instance-ai/example.ts`, source);
		expect(new AgentsInstanceAiBoundaryRule().analyze({ rootDir })).toHaveLength(1);
	});

	it('allows the backend API, public SDK entry points, and imports within Agents', () => {
		write(
			`${modules}/instance-ai/example.ts`,
			`
import { AgentsPublicApi } from '@/modules/agents/public-api';
export type { Contract } from '../agents/public-api.js';
const api = import('@agents/public-api');
import { Agent } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { Sandbox } from '@n8n/agents/sandbox';`,
		);
		write(`${modules}/agents/example.ts`, "import { internal } from './agents.service';");
		expect(new AgentsInstanceAiBoundaryRule().analyze({ rootDir })).toEqual([]);
	});

	it('checks nested test files and reports the source line', () => {
		write(
			`${modules}/agents/__tests__/example.test.ts`,
			"\nimport type { Port } from '@n8n/instance-ai';",
		);
		expect(new AgentsInstanceAiBoundaryRule().analyze({ rootDir })[0]).toMatchObject({ line: 2 });
	});
});
