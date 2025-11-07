import { resolveRelativePath } from '../../src/node-parameters/path-utils';

describe('resolveRelativePath', () => {
	test.each([
		['parameters.level1.level2.field', '&childField', 'level1.level2.childField'],
		['parameters.level1.level2[0].field', '&childField', 'level1.level2[0].childField'],
		['parameters.level1.level2.field', 'absolute.path', 'absolute.path'],
		['parameters', '&childField', 'childField'],
		['parameters.level1.level2.field', '', ''],
		['', '&childField', 'childField'],
		['', '', ''],
		['parameters.level1.level2.field', 'relative.path', 'relative.path'],
	])(
		'should resolve relative path for fullPath: %s and candidateRelativePath: %s',
		(fullPath, candidateRelativePath, expected) => {
			const result = resolveRelativePath(fullPath, candidateRelativePath);
			expect(result).toBe(expected);
		},
	);
});
