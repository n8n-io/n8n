import {
	loadAlaSqlSandbox,
	resetSandboxCache,
	runAlaSqlInSandbox,
} from '../../v3/helpers/sandbox-utils';

describe('combineBySql sandbox (isolated-vm)', () => {
	describe('loadAlaSqlSandbox', () => {
		beforeEach(() => {
			resetSandboxCache();
		});

		afterEach(() => {
			resetSandboxCache();
		});

		it('should return a context with alasql available', async () => {
			const context = await loadAlaSqlSandbox();
			const result = await context.eval('typeof alasql', { copy: true });
			expect(result).toBe('function');
		});

		it('should return the same cached context on subsequent calls', async () => {
			const context1 = await loadAlaSqlSandbox();
			const context2 = await loadAlaSqlSandbox();
			expect(context1).toBe(context2);
		});

		it('should recreate the sandbox after resetSandboxCache', async () => {
			const context1 = await loadAlaSqlSandbox();
			resetSandboxCache();
			const context2 = await loadAlaSqlSandbox();
			expect(context1).not.toBe(context2);
		});
	});

	describe('runAlaSqlInSandbox – isolation', () => {
		beforeAll(() => {
			resetSandboxCache();
		});

		afterAll(() => {
			resetSandboxCache();
		});

		// ── Host API access ────────────────────────────────────────────────────

		it('should not expose require inside the sandbox', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				context.eval('(function() { return typeof require; })()', { copy: true }),
			).resolves.toBe('undefined');
		});

		it('should not expose process inside the sandbox', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				context.eval('(function() { return typeof process; })()', { copy: true }),
			).resolves.toBe('undefined');
		});

		it('should not expose __dirname inside the sandbox', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				context.eval('(function() { return typeof __dirname; })()', { copy: true }),
			).resolves.toBe('undefined');
		});

		it('should not expose __filename inside the sandbox', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				context.eval('(function() { return typeof __filename; })()', { copy: true }),
			).resolves.toBe('undefined');
		});

		it('should not expose global inside the sandbox', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				context.eval('(function() { return typeof global; })()', { copy: true }),
			).resolves.toBe('undefined');
		});

		it('should not expose Buffer inside the sandbox', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				context.eval('(function() { return typeof Buffer; })()', { copy: true }),
			).resolves.toBe('undefined');
		});

		// ── File system access ─────────────────────────────────────────────────

		it('should block FROM FILE() SQL clause (no fs in browser bundle)', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				runAlaSqlInSandbox(
					context,
					[[{ id: 1 }]],
					"SELECT * FROM FILE('/etc/passwd', {headers: false})",
				),
			).rejects.toThrow();
		});

		it('should block ATTACH CSV FILE attempts', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				runAlaSqlInSandbox(
					context,
					[[{ id: 1 }]],
					"ATTACH CSV '/etc/passwd' AS secret; SELECT * FROM secret",
				),
			).rejects.toThrow();
		});

		it('should block SOURCE statement from reading files', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				runAlaSqlInSandbox(context, [[{ id: 1 }]], "SOURCE '/etc/passwd'"),
			).rejects.toThrow(/disabled/i);
		});

		it('should block REQUIRE statement from loading files', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				runAlaSqlInSandbox(context, [[{ id: 1 }]], "REQUIRE '/tmp/malicious.js'"),
			).rejects.toThrow(/disabled/i);
		});

		it('should block SELECT INTO FILE from writing files', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				runAlaSqlInSandbox(
					context,
					[[{ id: 1 }]],
					"SELECT * INTO FILE('/tmp/exfil.txt') FROM input1",
				),
			).rejects.toThrow();
		});

		it('should keep fetch and XMLHttpRequest stubs after alasql initialisation', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(context.eval("fetch('file:///etc/passwd')", { copy: true })).rejects.toThrow(
				/disabled/i,
			);
			await expect(context.eval('new XMLHttpRequest()', { copy: true })).rejects.toThrow(
				/disabled/i,
			);
		});

		// ── Code evaluation / function injection ───────────────────────────────

		it('should block CREATE FUNCTION from accessing host APIs', async () => {
			const context = await loadAlaSqlSandbox();
			// Even if a user crafts a SQL function, require is not in scope inside the isolate
			await expect(
				runAlaSqlInSandbox(
					context,
					[[{ id: 1 }]],
					'SELECT id FROM input1 WHERE alasql(\'CREATE FUNCTION danger() RETURNS STRING BEGIN RETURN typeof require END; SELECT danger() FROM [{"x":1}]\')',
				),
			).rejects.toThrow();
		});

		it('should return "undefined" for require even when called via a SQL function', async () => {
			const context = await loadAlaSqlSandbox();
			// CREATE FUNCTION compiles a JS body – require must still be absent
			await expect(
				runAlaSqlInSandbox(
					context,
					[[{ id: 1 }]],
					"SELECT alasql('CREATE FUNCTION getRequire() RETURNS STRING BEGIN RETURN typeof require END') FROM input1",
				),
			).rejects.toThrow();
		});

		it('should block eval() inside the sandbox from escaping isolation', async () => {
			const context = await loadAlaSqlSandbox();
			// eval exists in V8 but must not be able to reach host-side objects
			const result = (await context.eval(
				`(function() {
					try { return eval('typeof require'); }
					catch(e) { return 'error: ' + e.message; }
				})()`,
				{ copy: true },
			)) as string;
			// Either eval is blocked or require is still undefined inside eval'd code
			expect(result === 'undefined' || result.startsWith('error:')).toBe(true);
		});

		it('should block alasql arrow-operator prototype traversal from reaching host globals', async () => {
			const context = await loadAlaSqlSandbox();
			// process is unavailable in the isolate, the inner call silently fails, resulting in an empty object
			const result = await runAlaSqlInSandbox(
				context,
				[[{ id: 1 }]],
				'SELECT {}.constructor->constructor->[call](\'\',\'return {result: process.getBuiltinModule("child_process").execSync("id").toString()}\') AS r FROM input1',
			);
			expect(result).toEqual([{}]);
		});

		it('should block Function constructor from reaching host APIs', async () => {
			const context = await loadAlaSqlSandbox();
			const result = (await context.eval(
				`(function() {
					try { return new Function('return typeof require')(); }
					catch(e) { return 'error: ' + e.message; }
				})()`,
				{ copy: true },
			)) as string;
			expect(result === 'undefined' || result.startsWith('error:')).toBe(true);
		});

		// ── Prototype pollution ────────────────────────────────────────────────

		it('should contain prototype pollution within the isolate heap', async () => {
			const context = await loadAlaSqlSandbox();
			// Pollute Object.prototype inside the sandbox
			await context.eval('Object.prototype.__polluted = true', { copy: true });
			// Host-side Object.prototype must be untouched
			expect(({} as Record<string, unknown>).__polluted).toBeUndefined();
		});

		it('should have alasql.fn frozen after sandbox initialisation', async () => {
			const context = await loadAlaSqlSandbox();
			const isFrozen = (await context.eval('Object.isFrozen(alasql.fn)', {
				copy: true,
			})) as boolean;
			expect(isFrozen).toBe(true);
		});

		it('should not allow a CREATE FUNCTION', async () => {
			const context = await loadAlaSqlSandbox();

			await expect(
				runAlaSqlInSandbox(
					context,
					[[{ x: 1 }]],
					'CREATE FUNCTION double(n) RETURNS NUMBER BEGIN RETURN n * 2 END; SELECT double(x) AS v FROM input1',
				),
			).rejects.toThrow();

			await expect(
				runAlaSqlInSandbox(context, [[{ x: 1 }]], 'SELECT double(x) AS v FROM input1'),
			).rejects.toThrow();
		});

		// ── Resource limits ────────────────────────────────────────────────────

		it('should enforce the CPU timeout on an infinite loop', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(
				context.eval('(function() { while(true) {} })()', { timeout: 100, copy: true }),
			).rejects.toThrow();
		});
	});

	describe('runAlaSqlInSandbox – SQL execution', () => {
		beforeAll(() => {
			resetSandboxCache();
		});

		afterAll(() => {
			resetSandboxCache();
		});

		it('should execute a basic SELECT query', async () => {
			const context = await loadAlaSqlSandbox();
			const result = await runAlaSqlInSandbox(
				context,
				[
					[
						{ name: 'Alice', age: 30 },
						{ name: 'Bob', age: 25 },
					],
				],
				'SELECT * FROM input1',
			);
			expect(result).toEqual([
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			]);
		});

		it('should execute a JOIN query across two inputs', async () => {
			const context = await loadAlaSqlSandbox();
			const result = await runAlaSqlInSandbox(
				context,
				[
					[
						{ id: 1, name: 'Alice' },
						{ id: 2, name: 'Bob' },
					],
					[
						{ userId: 1, score: 100 },
						{ userId: 2, score: 200 },
					],
				],
				'SELECT input1.name, input2.score FROM input1 LEFT JOIN input2 ON input1.id = input2.userId',
			);
			expect(result).toEqual([
				{ name: 'Alice', score: 100 },
				{ name: 'Bob', score: 200 },
			]);
		});

		it('should execute a WHERE filter', async () => {
			const context = await loadAlaSqlSandbox();
			const result = await runAlaSqlInSandbox(
				context,
				[
					[
						{ id: 1, val: 10 },
						{ id: 2, val: 20 },
						{ id: 3, val: 30 },
					],
				],
				'SELECT * FROM input1 WHERE val > 15',
			);
			expect(result).toEqual([
				{ id: 2, val: 20 },
				{ id: 3, val: 30 },
			]);
		});

		it('should return an empty array for a query with no results', async () => {
			const context = await loadAlaSqlSandbox();
			const result = await runAlaSqlInSandbox(
				context,
				[[{ id: 1 }]],
				'SELECT * FROM input1 WHERE id = 999',
			);
			expect(result).toEqual([]);
		});

		it('should throw a meaningful error for invalid SQL', async () => {
			const context = await loadAlaSqlSandbox();
			await expect(runAlaSqlInSandbox(context, [[{ id: 1 }]], 'THIS IS NOT SQL')).rejects.toThrow();
		});

		it('should clean up its database after each execution', async () => {
			const context = await loadAlaSqlSandbox();

			const countBefore = (await context.eval('Object.keys(alasql.databases).length', {
				copy: true,
			})) as number;

			await runAlaSqlInSandbox(context, [[{ id: 1 }]], 'SELECT * FROM input1');
			await runAlaSqlInSandbox(context, [[{ id: 2 }]], 'SELECT * FROM input1');

			const countAfter = (await context.eval('Object.keys(alasql.databases).length', {
				copy: true,
			})) as number;

			// Database count must not grow – each invocation cleans up after itself
			expect(countAfter).toBe(countBefore);
		});
	});
});
