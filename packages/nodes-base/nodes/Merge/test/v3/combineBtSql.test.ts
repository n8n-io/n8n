import {
	createSandboxContext,
	resetSandboxCache,
	runAlaSqlInSandbox,
	withSandboxContext,
} from '../../v3/helpers/sandbox-utils';

describe('combineBySql sandbox (isolated-vm)', () => {
	describe('sandbox lifecycle', () => {
		beforeEach(() => {
			resetSandboxCache();
		});

		afterEach(() => {
			resetSandboxCache();
		});

		it('should return a context with alasql available', async () => {
			await withSandboxContext(async (context) => {
				const result = await context.eval('typeof alasql', { copy: true });
				expect(result).toBe('function');
			});
		});

		it('should return a fresh context on every call', async () => {
			const context1 = await createSandboxContext();
			const context2 = await createSandboxContext();
			try {
				expect(context1).not.toBe(context2);
			} finally {
				context1.release();
				context2.release();
			}
		});

		it('should rebuild the isolate after resetSandboxCache', async () => {
			const before = await createSandboxContext();
			before.release();
			resetSandboxCache();
			// Re-invocation must succeed (lazy rebuild) and yield a working context.
			await withSandboxContext(async (context) => {
				const result = await context.eval('typeof alasql', { copy: true });
				expect(result).toBe('function');
			});
		});
	});

	describe('runAlaSqlInSandbox – isolation', () => {
		// Reset between every test: each test creates fresh Contexts inside the
		// shared Isolate, and V8 GC does not always reclaim released-Context memory
		// quickly enough between rapid back-to-back tests, eventually tripping the
		// Isolate's memory limit. Recycling per test keeps the heap small.
		beforeEach(() => {
			resetSandboxCache();
		});

		afterAll(() => {
			resetSandboxCache();
		});

		// ── Host API access ────────────────────────────────────────────────────

		it('should not expose require inside the sandbox', async () => {
			await withSandboxContext(async (context) => {
				await expect(
					context.eval('(function() { return typeof require; })()', { copy: true }),
				).resolves.toBe('undefined');
			});
		});

		it('should not expose process inside the sandbox', async () => {
			await withSandboxContext(async (context) => {
				await expect(
					context.eval('(function() { return typeof process; })()', { copy: true }),
				).resolves.toBe('undefined');
			});
		});

		it('should not expose __dirname inside the sandbox', async () => {
			await withSandboxContext(async (context) => {
				await expect(
					context.eval('(function() { return typeof __dirname; })()', { copy: true }),
				).resolves.toBe('undefined');
			});
		});

		it('should not expose __filename inside the sandbox', async () => {
			await withSandboxContext(async (context) => {
				await expect(
					context.eval('(function() { return typeof __filename; })()', { copy: true }),
				).resolves.toBe('undefined');
			});
		});

		it('should not expose global inside the sandbox', async () => {
			await withSandboxContext(async (context) => {
				await expect(
					context.eval('(function() { return typeof global; })()', { copy: true }),
				).resolves.toBe('undefined');
			});
		});

		it('should not expose Buffer inside the sandbox', async () => {
			await withSandboxContext(async (context) => {
				await expect(
					context.eval('(function() { return typeof Buffer; })()', { copy: true }),
				).resolves.toBe('undefined');
			});
		});

		// ── File system access ─────────────────────────────────────────────────

		it('should block FROM FILE() SQL clause (no fs in browser bundle)', async () => {
			await expect(
				runAlaSqlInSandbox([[{ id: 1 }]], "SELECT * FROM FILE('/etc/passwd', {headers: false})"),
			).rejects.toThrow();
		});

		// Removing fetch/XMLHttpRequest is not enough: alasql's file sources fail soft
		// and can resolve to an empty result instead of throwing. The sources are
		// replaced with a throwing stub, so blocking is deterministic with a clear
		// reason — assert the reason so a regression that drops the stub is caught.
		it.each(['NDJSON', 'JSON', 'CSV', 'TXT', 'XML', 'XLSX'])(
			'should block FROM %s() deterministically with a clear error',
			async (source) => {
				await expect(
					runAlaSqlInSandbox([[{ id: 1 }]], `SELECT * FROM ${source}('data.file')`),
				).rejects.toThrow(/disabled/i);
			},
		);

		it('should block ATTACH CSV FILE attempts', async () => {
			await expect(
				runAlaSqlInSandbox(
					[[{ id: 1 }]],
					"ATTACH CSV '/etc/passwd' AS secret; SELECT * FROM secret",
				),
			).rejects.toThrow();
		});

		it('should block SOURCE statement from reading files', async () => {
			await expect(runAlaSqlInSandbox([[{ id: 1 }]], "SOURCE '/etc/passwd'")).rejects.toThrow(
				/disabled/i,
			);
		});

		it('should block REQUIRE statement from loading files', async () => {
			await expect(
				runAlaSqlInSandbox([[{ id: 1 }]], "REQUIRE '/tmp/malicious.js'"),
			).rejects.toThrow(/disabled/i);
		});

		it('should block SELECT INTO FILE from writing files', async () => {
			await expect(
				runAlaSqlInSandbox([[{ id: 1 }]], "SELECT * INTO FILE('/tmp/exfil.txt') FROM input1"),
			).rejects.toThrow();
		});

		it('should keep fetch and XMLHttpRequest stubs after alasql initialisation', async () => {
			await withSandboxContext(async (context) => {
				await expect(context.eval("fetch('file:///etc/passwd')", { copy: true })).rejects.toThrow(
					/disabled/i,
				);
				await expect(context.eval('new XMLHttpRequest()', { copy: true })).rejects.toThrow(
					/disabled/i,
				);
			});
		});

		// ── Code evaluation / function injection ───────────────────────────────

		it('should block CREATE FUNCTION from accessing host APIs', async () => {
			// Even if a user crafts a SQL function, require is not in scope inside the isolate
			await expect(
				runAlaSqlInSandbox(
					[[{ id: 1 }]],
					'SELECT id FROM input1 WHERE alasql(\'CREATE FUNCTION danger() RETURNS STRING BEGIN RETURN typeof require END; SELECT danger() FROM [{"x":1}]\')',
				),
			).rejects.toThrow();
		});

		it('should return "undefined" for require even when called via a SQL function', async () => {
			// CREATE FUNCTION compiles a JS body – require must still be absent
			await expect(
				runAlaSqlInSandbox(
					[[{ id: 1 }]],
					"SELECT alasql('CREATE FUNCTION getRequire() RETURNS STRING BEGIN RETURN typeof require END') FROM input1",
				),
			).rejects.toThrow();
		});

		it('should block eval() inside the sandbox from escaping isolation', async () => {
			await withSandboxContext(async (context) => {
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
		});

		it('should block alasql arrow-operator prototype traversal from reaching host globals', async () => {
			// process is unavailable in the isolate, the inner call silently fails, resulting in an empty object
			const result = await runAlaSqlInSandbox(
				[[{ id: 1 }]],
				'SELECT {}.constructor->constructor->[call](\'\',\'return {result: process.getBuiltinModule("child_process").execSync("id").toString()}\') AS r FROM input1',
			);
			expect(result).toEqual([{}]);
		});

		it('should block Function constructor from reaching host APIs', async () => {
			await withSandboxContext(async (context) => {
				const result = (await context.eval(
					`(function() {
						try { return new Function('return typeof require')(); }
						catch(e) { return 'error: ' + e.message; }
					})()`,
					{ copy: true },
				)) as string;
				expect(result === 'undefined' || result.startsWith('error:')).toBe(true);
			});
		});

		// ── State isolation ────────────────────────────────────────────────────

		it('should keep sandbox-side global mutations contained to the sandbox', async () => {
			await withSandboxContext(async (context) => {
				await context.eval('Object.prototype.__mutated = true', { copy: true });
				// Host-side Object.prototype must be untouched
				expect(({} as Record<string, unknown>).__mutated).toBeUndefined();
			});
		});

		it('should give each invocation a fresh global state independent of prior invocations', async () => {
			// A first call attempts to mutate the alasql output serializer to capture
			// a row field onto a shared intrinsic. A second call's serialization must
			// not observe that mutation, and the marker must not be visible to a
			// freshly created Context — each invocation runs in its own realm.
			const mutatingFn =
				'return function(){try{if(this&&this[0]&&this[0].value){Object.prototype.__marker=this[0].value;}}catch(e){} return this;}';
			const mutatingQuery = `DECLARE @o OBJECT; SET @o={}; SET @o->constructor->prototype->toJSON={}.constructor->constructor->[call]('', ${JSON.stringify(mutatingFn)})->[call](); SELECT 1 AS ok`;

			await runAlaSqlInSandbox([[{ value: 'first' }]], mutatingQuery);

			const second = await runAlaSqlInSandbox([[{ value: 'second' }]], 'SELECT * FROM input1');
			expect(second).toEqual([{ value: 'second' }]);
			expect(second[0]).not.toHaveProperty('__marker');

			const third = await runAlaSqlInSandbox([[{ value: 'third' }]], 'SELECT * FROM input1');
			expect(third).toEqual([{ value: 'third' }]);
			expect(third[0]).not.toHaveProperty('__marker');

			// And a freshly created Context must not carry the marker either
			await withSandboxContext(async (probe) => {
				const marker = (await probe.eval('typeof Object.prototype.__marker', {
					copy: true,
				})) as string;
				expect(marker).toBe('undefined');
			});
		});

		it('should have alasql.fn frozen after sandbox initialisation', async () => {
			await withSandboxContext(async (context) => {
				const isFrozen = (await context.eval('Object.isFrozen(alasql.fn)', {
					copy: true,
				})) as boolean;
				expect(isFrozen).toBe(true);
			});
		});

		it('should not allow a CREATE FUNCTION', async () => {
			await expect(
				runAlaSqlInSandbox(
					[[{ x: 1 }]],
					'CREATE FUNCTION double(n) RETURNS NUMBER BEGIN RETURN n * 2 END; SELECT double(x) AS v FROM input1',
				),
			).rejects.toThrow();

			await expect(
				runAlaSqlInSandbox([[{ x: 1 }]], 'SELECT double(x) AS v FROM input1'),
			).rejects.toThrow();
		});

		// ── Resource limits ────────────────────────────────────────────────────

		it('should enforce the CPU timeout on an infinite loop', async () => {
			await withSandboxContext(async (context) => {
				await expect(
					context.eval('(function() { while(true) {} })()', { timeout: 100, copy: true }),
				).rejects.toThrow();
			});
		});
	});

	describe('runAlaSqlInSandbox – SQL execution', () => {
		// Reset between every test so the shared isolate never carries accumulated
		// heap from a prior test into a fresh Context (see the isolation block above).
		// The probe queries here go through withSandboxContext directly, which has no
		// retry, so they rely on starting from a clean isolate.
		beforeEach(() => {
			resetSandboxCache();
		});

		afterAll(() => {
			resetSandboxCache();
		});

		it('should execute a basic SELECT query', async () => {
			const result = await runAlaSqlInSandbox(
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
			const result = await runAlaSqlInSandbox(
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
			const result = await runAlaSqlInSandbox(
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
			const result = await runAlaSqlInSandbox([[{ id: 1 }]], 'SELECT * FROM input1 WHERE id = 999');
			expect(result).toEqual([]);
		});

		it('should throw a meaningful error for invalid SQL', async () => {
			await expect(runAlaSqlInSandbox([[{ id: 1 }]], 'THIS IS NOT SQL')).rejects.toThrow();
		});

		it('should not retain databases across executions', async () => {
			// Baseline: a freshly created context only contains alasql's defaults.
			const baseline = await withSandboxContext(async (probe) => {
				return (await probe.eval('Object.keys(alasql.databases).length', {
					copy: true,
				})) as number;
			});

			await runAlaSqlInSandbox([[{ id: 1 }]], 'SELECT * FROM input1');
			await runAlaSqlInSandbox([[{ id: 2 }]], 'SELECT * FROM input1');

			// After two runs, a fresh context must still see the same baseline —
			// proving per-invocation databases do not accumulate in any shared state.
			const after = await withSandboxContext(async (probe) => {
				return (await probe.eval('Object.keys(alasql.databases).length', {
					copy: true,
				})) as number;
			});
			expect(after).toBe(baseline);
		});

		it('should handle a large dataset (25k rows) without exhausting the sandbox', async () => {
			const rows = Array.from({ length: 25_000 }, (_, i) => ({
				id: i,
				a: `v${i}`,
				b: i * 2,
				c: i % 7,
				d: `tag-${i % 100}`,
				e: i % 2 === 0,
				f: i / 3,
				g: `group-${i % 50}`,
				h: i,
				j: `x${i}`,
			}));
			const result = await runAlaSqlInSandbox(
				[rows],
				'SELECT COUNT(*) AS n FROM input1 WHERE b > 10000',
			);
			expect(result[0]).toEqual({ n: 19999 });
		});
	});
});
