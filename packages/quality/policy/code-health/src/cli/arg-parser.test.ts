import { describe, expect, it } from 'vitest';

import { parseArgs } from './arg-parser.js';

describe('parseArgs', () => {
	it('defaults to analyze when given no positional', () => {
		expect(parseArgs([]).command).toBe('analyze');
		expect(parseArgs(['--rule=single-instance-libs']).command).toBe('analyze');
	});

	it('accepts each subcommand and passes the rest through', () => {
		const options = parseArgs(['verify-closure', '/tmp/closure']);

		expect(options.command).toBe('verify-closure');
		expect(options.args).toEqual(['/tmp/closure']);
	});

	// A silent fallback to `analyze` would exit 0 having checked nothing the caller asked for,
	// and every caller spells the subcommand out in a YAML or shell literal.
	it.each(['verify-clsoure', 'verify_closure', 'Verify-Closure', 'check'])(
		'rejects the unknown command %j instead of falling back to analyze',
		(command) => {
			expect(() => parseArgs([command])).toThrow(/Unknown command/);
		},
	);

	it('names the accepted commands when rejecting', () => {
		expect(() => parseArgs(['nope'])).toThrow(/verify-closure/);
	});
});
