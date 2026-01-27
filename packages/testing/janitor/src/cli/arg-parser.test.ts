import { describe, it, expect, afterEach } from 'vitest';

import { parseArgs } from './arg-parser.js';

describe('arg-parser', () => {
	const originalArgv = process.argv;

	afterEach(() => {
		process.argv = originalArgv;
	});

	function setArgs(args: string[]): void {
		process.argv = ['node', 'cli.js', ...args];
	}

	describe('subcommands', () => {
		it('defaults to analyze command', () => {
			setArgs([]);
			const result = parseArgs();
			expect(result.command).toBe('analyze');
		});

		it('parses tcr command', () => {
			setArgs(['tcr']);
			const result = parseArgs();
			expect(result.command).toBe('tcr');
		});

		it('parses inventory command', () => {
			setArgs(['inventory']);
			const result = parseArgs();
			expect(result.command).toBe('inventory');
		});

		it('parses impact command', () => {
			setArgs(['impact']);
			const result = parseArgs();
			expect(result.command).toBe('impact');
		});

		it('parses method-impact command', () => {
			setArgs(['method-impact']);
			const result = parseArgs();
			expect(result.command).toBe('method-impact');
		});

		it('parses baseline command', () => {
			setArgs(['baseline']);
			const result = parseArgs();
			expect(result.command).toBe('baseline');
		});
	});

	describe('boolean flags', () => {
		it('parses --help', () => {
			setArgs(['--help']);
			const result = parseArgs();
			expect(result.help).toBe(true);
		});

		it('parses -h', () => {
			setArgs(['-h']);
			const result = parseArgs();
			expect(result.help).toBe(true);
		});

		it('parses --json', () => {
			setArgs(['--json']);
			const result = parseArgs();
			expect(result.json).toBe(true);
		});

		it('parses --verbose', () => {
			setArgs(['--verbose']);
			const result = parseArgs();
			expect(result.verbose).toBe(true);
		});

		it('parses -v', () => {
			setArgs(['-v']);
			const result = parseArgs();
			expect(result.verbose).toBe(true);
		});

		it('parses --fix', () => {
			setArgs(['--fix']);
			const result = parseArgs();
			expect(result.fix).toBe(true);
		});

		it('parses --write', () => {
			setArgs(['--write']);
			const result = parseArgs();
			expect(result.write).toBe(true);
		});

		it('parses --list', () => {
			setArgs(['--list']);
			const result = parseArgs();
			expect(result.list).toBe(true);
		});

		it('parses -l', () => {
			setArgs(['-l']);
			const result = parseArgs();
			expect(result.list).toBe(true);
		});

		it('parses --execute', () => {
			setArgs(['--execute']);
			const result = parseArgs();
			expect(result.execute).toBe(true);
		});

		it('parses -x', () => {
			setArgs(['-x']);
			const result = parseArgs();
			expect(result.execute).toBe(true);
		});

		it('parses --test-list', () => {
			setArgs(['--test-list']);
			const result = parseArgs();
			expect(result.testList).toBe(true);
		});

		it('parses --index', () => {
			setArgs(['--index']);
			const result = parseArgs();
			expect(result.methodIndex).toBe(true);
		});

		it('parses --allow-in-expect', () => {
			setArgs(['--allow-in-expect']);
			const result = parseArgs();
			expect(result.allowInExpect).toBe(true);
		});

		it('parses --ignore-baseline', () => {
			setArgs(['--ignore-baseline']);
			const result = parseArgs();
			expect(result.ignoreBaseline).toBe(true);
		});
	});

	describe('value flags', () => {
		it('parses --config=path', () => {
			setArgs(['--config=/path/to/config.js']);
			const result = parseArgs();
			expect(result.config).toBe('/path/to/config.js');
		});

		it('parses --rule=id', () => {
			setArgs(['--rule=dead-code']);
			const result = parseArgs();
			expect(result.rule).toBe('dead-code');
		});

		it('parses --file=path', () => {
			setArgs(['--file=src/file.ts']);
			const result = parseArgs();
			expect(result.files).toContain('src/file.ts');
		});

		it('parses --files=comma,separated', () => {
			setArgs(['--files=a.ts,b.ts,c.ts']);
			const result = parseArgs();
			expect(result.files).toEqual(['a.ts', 'b.ts', 'c.ts']);
		});

		it('parses --message=text', () => {
			setArgs(['--message=Fix bug']);
			const result = parseArgs();
			expect(result.message).toBe('Fix bug');
		});

		it('parses -m=text', () => {
			setArgs(['-m=Fix bug']);
			const result = parseArgs();
			expect(result.message).toBe('Fix bug');
		});

		it('parses --base=ref', () => {
			setArgs(['--base=HEAD~1']);
			const result = parseArgs();
			expect(result.baseRef).toBe('HEAD~1');
		});

		it('parses --method=Class.method', () => {
			setArgs(['--method=CanvasPage.addNode']);
			const result = parseArgs();
			expect(result.method).toBe('CanvasPage.addNode');
		});

		it('parses --target-branch=name', () => {
			setArgs(['--target-branch=main']);
			const result = parseArgs();
			expect(result.targetBranch).toBe('main');
		});

		it('parses --max-diff-lines=number', () => {
			setArgs(['--max-diff-lines=500']);
			const result = parseArgs();
			expect(result.maxDiffLines).toBe(500);
		});

		it('parses --test-command=cmd', () => {
			setArgs(['--test-command=pnpm test']);
			const result = parseArgs();
			expect(result.testCommand).toBe('pnpm test');
		});
	});

	describe('combined arguments', () => {
		it('parses subcommand with flags', () => {
			setArgs(['tcr', '--execute', '--verbose', '-m=Fix bug']);
			const result = parseArgs();

			expect(result.command).toBe('tcr');
			expect(result.execute).toBe(true);
			expect(result.verbose).toBe(true);
			expect(result.message).toBe('Fix bug');
		});

		it('parses multiple file flags', () => {
			setArgs(['--file=a.ts', '--file=b.ts']);
			const result = parseArgs();

			expect(result.files).toContain('a.ts');
			expect(result.files).toContain('b.ts');
		});
	});

	describe('default values', () => {
		it('has correct defaults', () => {
			setArgs([]);
			const result = parseArgs();

			expect(result.command).toBe('analyze');
			expect(result.config).toBeUndefined();
			expect(result.rule).toBeUndefined();
			expect(result.files).toEqual([]);
			expect(result.json).toBe(false);
			expect(result.verbose).toBe(false);
			expect(result.fix).toBe(false);
			expect(result.write).toBe(false);
			expect(result.help).toBe(false);
			expect(result.list).toBe(false);
			expect(result.execute).toBe(false);
			expect(result.message).toBeUndefined();
			expect(result.baseRef).toBeUndefined();
			expect(result.targetBranch).toBeUndefined();
			expect(result.maxDiffLines).toBeUndefined();
			expect(result.testCommand).toBeUndefined();
			expect(result.testList).toBe(false);
			expect(result.method).toBeUndefined();
			expect(result.methodIndex).toBe(false);
			expect(result.allowInExpect).toBe(false);
			expect(result.ignoreBaseline).toBe(false);
		});
	});
});
