import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SkillsModuleBoundaryRule } from './skills-module-boundary.rule.js';

describe('SkillsModuleBoundaryRule', () => {
	let rootDir: string;
	const modules = 'packages/cli/src/modules';

	function write(file: string, content: string) {
		const fullPath = path.join(rootDir, file);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	const analyze = () => new SkillsModuleBoundaryRule().analyze({ rootDir });

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-module-boundary-'));
		write(
			'packages/cli/tsconfig.json',
			JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
		);
	});

	afterEach(() => fs.rmSync(rootDir, { recursive: true, force: true }));

	it.each([
		"import { SkillService } from '../skills/services/skill.service';",
		"import { SkillService } from '@/modules/skills/services/skill.service';",
		"import type { Skill } from '../skills/database/entities/skill.entity';",
		"export * from '../skills/utils/skill-names';",
		"const service = import('@/modules/skills/services/skill.service');",
		'const service = import(`../skills/services/skill.service.js`);',
		"type Service = import('../skills/services/skill.service').SkillService;",
		"import { seedSkill } from '../skills/testing';",
	])('rejects private imports from outside the module: %s', (source) => {
		write(`${modules}/agents/example.ts`, source);
		expect(analyze()).toEqual([
			expect.objectContaining({
				line: 1,
				message: expect.stringContaining('its public API'),
				suggestion: expect.stringContaining('Export the symbol from its index.ts'),
			}),
		]);
	});

	it('rejects a mock of a private file from tests outside the module', () => {
		write(
			`${modules}/agents/__tests__/example.test.ts`,
			"\nvi.mock('@/modules/skills/services/skill.service', () => ({}));",
		);
		expect(analyze()).toEqual([
			expect.objectContaining({ line: 2, message: expect.stringContaining('test fixtures') }),
		]);
	});

	it('allows the public API from outside the module, and fixtures from tests', () => {
		write(
			`${modules}/agents/example.ts`,
			`
import { SkillService } from '@/modules/skills';
import { SkillsGate } from '../skills';
import { SkillUsage } from '../skills/index.js';
import { tools } from './builder/skills/tools';`,
		);
		write(
			`${modules}/agents/__tests__/example.test.ts`,
			`
import { seedSkill } from '@/modules/skills/testing';
import { SkillService } from '../../skills';`,
		);
		write('packages/cli/test/integration/example.test.ts', "import '@/modules/skills/testing';");
		expect(analyze()).toEqual([]);
	});

	it('rejects private imports from tests outside the module', () => {
		write(
			'packages/cli/test/integration/example.test.ts',
			"\nimport { SkillService } from '../../src/modules/skills/services/skill.service';",
		);
		expect(analyze()).toEqual([
			expect.objectContaining({ line: 2, message: expect.stringContaining('test fixtures') }),
		]);
	});

	it.each([
		"import { Foo } from '../../../services/foo';",
		"import { RoleService } from '../../../permissions.ee/role-service';",
		"import { Foo } from '@/services/foo';",
		"import { AgentSkillUsage } from '../../agents/agent-skill-usage';",
		"import { McpService } from '@/modules/mcp/mcp.service';",
		"const foo = import('../../../services/foo');",
		"import { helper } from '../../../../test/integration/shared/utils';",
	])('rejects cli imports from inside the module: %s', (source) => {
		write(`${modules}/skills/services/example.ts`, source);
		expect(analyze()).toEqual([
			expect.objectContaining({
				line: 1,
				message: expect.stringContaining('allowlist'),
				suggestion: expect.stringContaining('SkillUsageProxy'),
			}),
		]);
	});

	it('allows the allowlist, the module itself and packages from inside the module', () => {
		write(
			`${modules}/skills/services/example.ts`,
			`
import { PostHogClient } from '@/posthog';
import { Telemetry } from '../../../telemetry';
import { userHasScopes } from '@/permissions.ee/check-access';
import { Skill } from '../database/entities/skill.entity';
import { SkillService } from '@/modules/skills/services/skill.service';
import { Service } from '@n8n/di';`,
		);
		write(
			`${modules}/skills/__tests__/example.test.ts`,
			"import { createOwner } from '../../../../test/integration/shared/db/users';",
		);
		expect(analyze()).toEqual([]);
	});
});
