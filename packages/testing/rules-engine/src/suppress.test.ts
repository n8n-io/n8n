import { Project, SyntaxKind, type Node } from 'ts-morph';
import { describe, expect, it } from 'vitest';

import { AstRule } from './ast/ast-rule.js';
import { isSuppressed } from './suppress.js';
import type { Violation } from './types.js';

class StubRule extends AstRule {
	readonly id = 'stub-rule';
	readonly name = 'Stub';
	readonly description = 'Stub';
	readonly severity = 'error' as const;
	analyze(): Violation[] {
		return [];
	}
}

const rule = new StubRule();

/** Build a node on the last line of `code`, with the matching `lines` array. */
function lastCall(code: string): { node: Node; lines: string[] } {
	const project = new Project({ useInMemoryFileSystem: true });
	const file = project.createSourceFile('x.ts', code);
	const node = file.getDescendantsOfKind(SyntaxKind.CallExpression).at(-1);
	if (!node) throw new Error('test fixture has no call expression');
	return { node, lines: code.split('\n') };
}

describe('isSuppressed', () => {
	it('suppresses when the directive names the rule', () => {
		const { node, lines } = lastCall('// janitor-disable-next-line stub-rule\ndoThing();');
		expect(isSuppressed(rule, lines, node)).toBe(true);
	});

	it('suppresses when the directive names the rule with a trailing reason', () => {
		const { node, lines } = lastCall(
			'// janitor-disable-next-line stub-rule -- intentional\ndoThing();',
		);
		expect(isSuppressed(rule, lines, node)).toBe(true);
	});

	it('suppresses everything for a bare directive (no rule ids listed)', () => {
		const { node, lines } = lastCall('// janitor-disable-next-line \ndoThing();');
		expect(isSuppressed(rule, lines, node)).toBe(true);
	});

	it('does not suppress when the directive names a different rule', () => {
		const { node, lines } = lastCall('// janitor-disable-next-line other-rule\ndoThing();');
		expect(isSuppressed(rule, lines, node)).toBe(false);
	});

	it('does not suppress without a directive', () => {
		const { node, lines } = lastCall('const x = 1;\ndoThing();');
		expect(isSuppressed(rule, lines, node)).toBe(false);
	});
});
