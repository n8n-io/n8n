import { resolveVariables, type ScopedVariable } from '../src/common';

describe('resolveVariables', () => {
	it('returns only globals when no projectId is given', () => {
		const variables: ScopedVariable[] = [
			{ key: 'GLOBAL', value: 'global' },
			{ key: 'PROJECT', value: 'project', project: { id: 'p1' } },
		];

		expect(resolveVariables(variables)).toEqual({ GLOBAL: 'global' });
	});

	it('overrides a same-key global with the matching project variable', () => {
		const variables: ScopedVariable[] = [
			{ key: 'SHARED', value: 'global' },
			{ key: 'SHARED', value: 'project', project: { id: 'p1' } },
		];

		expect(resolveVariables(variables, 'p1')).toEqual({ SHARED: 'project' });
	});

	it('lets the project variable win regardless of input order', () => {
		const projectFirst: ScopedVariable[] = [
			{ key: 'SHARED', value: 'project', project: { id: 'p1' } },
			{ key: 'SHARED', value: 'global' },
		];

		expect(resolveVariables(projectFirst, 'p1')).toEqual({ SHARED: 'project' });
	});

	it('ignores project variables that belong to a different project', () => {
		const variables: ScopedVariable[] = [
			{ key: 'SHARED', value: 'global' },
			{ key: 'SHARED', value: 'other-project', project: { id: 'p2' } },
		];

		expect(resolveVariables(variables, 'p1')).toEqual({ SHARED: 'global' });
	});

	it('keeps globals that have no project override and adds project-only keys', () => {
		const variables: ScopedVariable[] = [
			{ key: 'GLOBAL_ONLY', value: 'global' },
			{ key: 'SHARED', value: 'global' },
			{ key: 'SHARED', value: 'project', project: { id: 'p1' } },
			{ key: 'PROJECT_ONLY', value: 'project', project: { id: 'p1' } },
		];

		expect(resolveVariables(variables, 'p1')).toEqual({
			GLOBAL_ONLY: 'global',
			SHARED: 'project',
			PROJECT_ONLY: 'project',
		});
	});
});
