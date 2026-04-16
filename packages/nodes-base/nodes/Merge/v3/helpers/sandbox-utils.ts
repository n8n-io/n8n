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

// Singleton – recreated only after resetSandboxCache() (tests) or isolate disposal.
let sandboxIsolate: IsolatedVM.Isolate | null = null;
let sandboxContext: IsolatedVM.Context | null = null;

/** Disposes the cached isolate. Exposed for tests only. */
export function resetSandboxCache(): void {
	sandboxContext = null;
	if (sandboxIsolate && !sandboxIsolate.isDisposed) {
		sandboxIsolate.dispose();
	}
	sandboxIsolate = null;
}

/** Returns a cached isolated-vm context with alasql pre-loaded. Creates it on first call. */
export async function loadAlaSqlSandbox(): Promise<IsolatedVM.Context> {
	if (sandboxContext && sandboxIsolate && !sandboxIsolate.isDisposed) {
		return sandboxContext;
	}

	const ivm = await getIvm();

	sandboxIsolate = new ivm.Isolate({ memoryLimit: 64 }); // 64 MB hard limit
	sandboxContext = await sandboxIsolate.createContext();

	// Block network/file APIs before loading alasql to prevent
	// file access via SQL statements (e.g. SOURCE, REQUIRE).
	// Must be non-writable/non-configurable so the alasql bundle cannot overwrite them.
	await sandboxContext.eval(`
		function blockedNetworkOrFileApi() { throw new Error('Network and file system access is disabled in the SQL sandbox'); }
		Object.defineProperty(globalThis, 'fetch', { value: blockedNetworkOrFileApi, writable: false, configurable: false });
		Object.defineProperty(globalThis, 'XMLHttpRequest', { value: blockedNetworkOrFileApi, writable: false, configurable: false });
	`);

	// Browser bundle only – no Node.js fs/require handlers inside the isolate.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const alasqlBundlePath = require.resolve('alasql/dist/alasql.min.js');
	await sandboxContext.eval(await readFile(alasqlBundlePath, 'utf-8'));
	await sandboxContext.eval('Object.freeze(alasql.fn)');

	return sandboxContext;
}

/**
 * Runs a SQL query against plain-object table data inside the isolated-vm sandbox.
 * Only JSON-serialisable values cross the isolate boundary.
 */
export async function runAlaSqlInSandbox(
	context: IsolatedVM.Context,
	tableData: unknown[][],
	query: string,
): Promise<IDataObject[]> {
	// UUID per invocation so concurrent calls sharing the singleton context
	// don't collide on alasql.databases.
	const dbId = randomUUID();

	// Double-serialization: outer JSON.stringify produces a JSON string, inner produces a JSON literal
	// embedded in the script source. Inside the isolate, JSON.parse reconstructs the plain array.
	// This ensures data enters the isolate as a parsed JSON literal, never as live objects.
	const script = `(function() {
		const __rows = JSON.parse(${JSON.stringify(JSON.stringify(tableData))});
		const __db = new alasql.Database(${JSON.stringify(dbId)});
		try {
			for (let i = 0; i < __rows.length; i++) {
				__db.exec('CREATE TABLE input' + (i + 1));
				__db.tables['input' + (i + 1)].data = __rows[i];
			}
			return JSON.stringify(__db.exec(${JSON.stringify(query)}));
		} finally {
			delete alasql.databases[${JSON.stringify(dbId)}];
		}
	})()`;

	const resultJson = (await context.eval(script, { timeout: 5000, copy: true })) as string;
	try {
		return JSON.parse(resultJson) as IDataObject[];
	} catch (e) {
		throw new Error(`Failed to parse SQL result: ${(e as Error).message}`);
	}
}
