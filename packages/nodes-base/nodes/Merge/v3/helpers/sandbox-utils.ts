import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import type { IDataObject } from 'n8n-workflow';
import type IsolatedVM from 'isolated-vm';

// Lazy-loaded isolated-vm — avoids loading the native module at startup.
// The module is only loaded when combineBySql is actually used.
type IsolatedVm = typeof IsolatedVM;
let _ivm: IsolatedVm | null = null;

async function getIvm(): Promise<IsolatedVm> {
	if (!_ivm) {
		const mod = await import('isolated-vm');
		_ivm = mod.default;
	}
	return _ivm!;
}

// Hard heap limit for the cached isolate, in MB. Exceeding it disposes the
// isolate mid-execution; ensureSandbox then rebuilds it lazily on the next call.
const SANDBOX_MEMORY_LIMIT_MB = 64;

/**
 * Whether an error is the isolate signalling that it ran out of memory (heap
 * limit reached, or the isolate was disposed mid-execution as a result). Such
 * errors are recoverable by rebuilding the isolate — distinct from genuine query
 * errors. Kept as a single source of truth so callers classify consistently.
 */
export function isSandboxMemoryError(error: unknown): boolean {
	const raw = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
	return /isolate.*dispos|memory limit|exhausted/i.test(raw);
}

// Cached across calls: the Isolate and the compiled alasql bootstrap script.
// A fresh Context is created per execution so each invocation runs against its
// own globals and intrinsics, independent of any state left behind by prior calls.
let sandboxIsolate: IsolatedVM.Isolate | null = null;
let alasqlBootstrap: IsolatedVM.Script | null = null;

/** Disposes the cached isolate and bootstrap. Exposed for tests only. */
export function resetSandboxCache(): void {
	alasqlBootstrap = null;
	if (sandboxIsolate && !sandboxIsolate.isDisposed) {
		sandboxIsolate.dispose();
	}
	sandboxIsolate = null;
}

async function ensureSandbox(): Promise<{
	isolate: IsolatedVM.Isolate;
	bootstrap: IsolatedVM.Script;
}> {
	if (sandboxIsolate && !sandboxIsolate.isDisposed && alasqlBootstrap) {
		return { isolate: sandboxIsolate, bootstrap: alasqlBootstrap };
	}

	const ivm = await getIvm();
	sandboxIsolate = new ivm.Isolate({ memoryLimit: SANDBOX_MEMORY_LIMIT_MB });

	// Browser bundle only — no Node.js fs/require handlers inside the isolate.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const alasqlBundlePath = require.resolve('alasql/dist/alasql.min.js');
	const alasqlSource = await readFile(alasqlBundlePath, 'utf-8');

	// compileScript parses once into V8 bytecode; running it into a fresh Context
	// per invocation is cheap. Network/file APIs are stubbed before alasql loads
	// so the bundle cannot overwrite them — properties are non-writable/non-configurable.
	//
	// alasql's file/network data sources (FROM NDJSON('x'), INTO CSV('x'), …) are then
	// replaced with a throwing stub. Removing fetch/XMLHttpRequest alone is not enough:
	// those sources fail soft — depending on alasql's async/sync code path they can
	// return an empty result instead of throwing, so the query silently "succeeds".
	// Replacing the sources makes every file/network access deterministically throw.
	// The in-memory sources (INFORMATION_SCHEMA, RANGE) are left intact; user tables
	// (FROM input1) don't go through alasql.from at all.
	alasqlBootstrap = await sandboxIsolate.compileScript(`
		function blockedNetworkOrFileApi() { throw new Error('Network and file system access is disabled in the SQL sandbox'); }
		Object.defineProperty(globalThis, 'fetch', { value: blockedNetworkOrFileApi, writable: false, configurable: false });
		Object.defineProperty(globalThis, 'XMLHttpRequest', { value: blockedNetworkOrFileApi, writable: false, configurable: false });
		${alasqlSource}
		[
			'FILE', 'JSON', 'JSONL', 'NDJSON', 'TXT', 'TSV', 'TAB', 'CSV',
			'XLS', 'XLSX', 'ODS', 'XML', 'HTML', 'GEXF', 'METEOR', 'TABLETOP',
		].forEach(function (source) { alasql.from[source] = blockedNetworkOrFileApi; });
		Object.keys(alasql.into).forEach(function (target) { alasql.into[target] = blockedNetworkOrFileApi; });
		Object.freeze(alasql.from);
		Object.freeze(alasql.into);
		Object.freeze(alasql.fn);
	`);

	return { isolate: sandboxIsolate, bootstrap: alasqlBootstrap };
}

/**
 * Creates a fresh isolated-vm Context with alasql pre-loaded. Each call returns a
 * new Context with its own globals and intrinsics; the underlying Isolate and
 * compiled bootstrap are cached across calls. The caller is responsible for
 * `release()`-ing the returned Context — prefer {@link withSandboxContext} which
 * handles the lifecycle automatically.
 */
export async function createSandboxContext(): Promise<IsolatedVM.Context> {
	const { isolate, bootstrap } = await ensureSandbox();
	const context = await isolate.createContext();
	try {
		await bootstrap.run(context);
	} catch (e) {
		// Bootstrap can fail (e.g. memory limit, isolate disposed mid-flight) — make
		// sure the freshly allocated context doesn't dangle inside the isolate.
		context.release();
		throw e;
	}
	return context;
}

/**
 * Runs `fn` against a fresh isolated-vm Context and releases the Context when `fn`
 * settles. Use this in preference to {@link createSandboxContext} — it removes the
 * release-on-every-path obligation from callers.
 */
export async function withSandboxContext<T>(
	fn: (context: IsolatedVM.Context) => Promise<T>,
): Promise<T> {
	const context = await createSandboxContext();
	try {
		return await fn(context);
	} finally {
		context.release();
	}
}

/**
 * Runs a SQL query against plain-object table data inside a freshly created
 * isolated-vm Context. Only JSON-serialisable values cross the isolate boundary.
 */
export async function runAlaSqlInSandbox(
	tableData: unknown[][],
	query: string,
): Promise<IDataObject[]> {
	try {
		return await executeAlaSql(tableData, query);
	} catch (error) {
		// Hitting the isolate's memory limit disposes the isolate. That can mean
		// this dataset is genuinely too large, but it can also be transient: earlier
		// calls may have left behind Contexts that V8 has not reclaimed yet, pushing
		// an otherwise small query over the limit. Retry once — ensureSandbox lazily
		// rebuilds the disposed isolate on a clean heap, so a transient accumulation
		// succeeds while a truly oversized dataset fails again and propagates.
		if (isSandboxMemoryError(error)) {
			return await executeAlaSql(tableData, query);
		}
		throw error;
	}
}

async function executeAlaSql(tableData: unknown[][], query: string): Promise<IDataObject[]> {
	const dbId = randomUUID();

	// evalClosure binds ($0, $1, $2) as parameters of an implicit wrapping function,
	// so they stay local to this call. arguments.copy uses V8 structured clone,
	// which strips prototypes and functions so only inert plain data crosses the
	// isolate boundary.
	const script = `
		const rows = $0, dbId = $1, query = $2;
		const db = new alasql.Database(dbId);
		try {
			for (let i = 0; i < rows.length; i++) {
				db.exec('CREATE TABLE input' + (i + 1));
				db.tables['input' + (i + 1)].data = rows[i];
			}
			return JSON.stringify(db.exec(query));
		} finally {
			delete alasql.databases[dbId];
		}
	`;

	return await withSandboxContext(async (context) => {
		const resultJson = (await context.evalClosure(script, [tableData, dbId, query], {
			arguments: { copy: true },
			result: { copy: true },
			timeout: 30000,
		})) as string;
		try {
			return JSON.parse(resultJson) as IDataObject[];
		} catch (e) {
			throw new Error(`Failed to parse SQL result: ${(e as Error).message}`);
		}
	});
}
