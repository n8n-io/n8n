import { pickVariableForProject, resolveVariables, type ScopedVariable } from '../src/common';

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

describe('pickVariableForProject', () => {
	const global: ScopedVariable = { key: 'SHARED', value: 'global' };
	const scoped: ScopedVariable = { key: 'SHARED', value: 'project', project: { id: 'p1' } };
	const otherProject: ScopedVariable = { key: 'SHARED', value: 'other', project: { id: 'p2' } };

	it('picks the project-scoped variable over a same-key global', () => {
		expect(pickVariableForProject([global, scoped], 'SHARED', 'p1')).toBe(scoped);
		expect(pickVariableForProject([scoped, global], 'SHARED', 'p1')).toBe(scoped);
	});

	it('falls back to the global when the project has no matching variable', () => {
		expect(pickVariableForProject([global, otherProject], 'SHARED', 'p1')).toBe(global);
	});

	it('ignores project variables when no projectId is given', () => {
		expect(pickVariableForProject([scoped, global], 'SHARED')).toBe(global);
		expect(pickVariableForProject([scoped], 'SHARED')).toBeUndefined();
	});

	it('returns undefined when no variable matches the key', () => {
		expect(pickVariableForProject([global, scoped], 'MISSING', 'p1')).toBeUndefined();
	});
});
