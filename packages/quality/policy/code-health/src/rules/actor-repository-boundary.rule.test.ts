import { createInMemoryProject } from '@n8n/rules-engine/ast';
import { describe, it, expect } from 'vitest';

import { ActorRepositoryBoundaryRule } from './actor-repository-boundary.rule.js';

const USES_USER_REPOSITORY = `
import { UserRepository, ProjectRepository } from '@n8n/db';
export class X { constructor(private readonly users: UserRepository) {} }
`;

const USES_ACTOR_REPOSITORY = `
import { ActorRepository } from '@n8n/db';
export class X { constructor(private readonly actors: ActorRepository) {} }
`;

describe('ActorRepositoryBoundaryRule', () => {
	const rule = new ActorRepositoryBoundaryRule();

	const analyze = (files: Record<string, string>) => {
		const project = createInMemoryProject();
		for (const [filePath, code] of Object.entries(files)) {
			project.createSourceFile(filePath, code);
		}
		return rule.analyzeProject(project);
	};

	it('flags UserRepository outside a human-only surface', () => {
		const violations = analyze({
			'/packages/cli/src/services/ownership.service.ts': USES_USER_REPOSITORY,
		});

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('services/ownership.service.ts');
		expect(violations[0].line).toBe(2);
	});

	it('allows UserRepository in a human-only directory or file', () => {
		const violations = analyze({
			'/packages/cli/src/auth/auth.service.ts': USES_USER_REPOSITORY,
			'/packages/cli/src/controllers/users.controller.ts': USES_USER_REPOSITORY,
		});

		expect(violations).toHaveLength(0);
	});

	it('ignores ActorRepository and other @n8n/db imports', () => {
		const violations = analyze({
			'/packages/cli/src/services/ownership.service.ts': USES_ACTOR_REPOSITORY,
		});

		expect(violations).toHaveLength(0);
	});

	it('takes the allow list from the options', () => {
		const project = createInMemoryProject();
		project.createSourceFile('/packages/cli/src/custom/human.service.ts', USES_USER_REPOSITORY);

		expect(rule.analyzeProject(project, ['packages/cli/src/custom/'])).toHaveLength(0);
		expect(rule.analyzeProject(project, [])).toHaveLength(1);
	});
});
