import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import ivm from 'isolated-vm';

import type { IDataObject } from 'n8n-workflow';

// Singleton – recreated only after resetSandboxCache() (tests) or isolate disposal.
let sandboxIsolate: ivm.Isolate | null = null;
let sandboxContext: ivm.Context | null = null;

/** Disposes the cached isolate. Exposed for tests only. */
export function resetSandboxCache(): void {
	sandboxContext = null;
	if (sandboxIsolate && !sandboxIsolate.isDisposed) {
		sandboxIsolate.dispose();
	}
	sandboxIsolate = null;
}

/** Returns a cached isolated-vm context with alasql pre-loaded. Creates it on first call. */
export async function loadAlaSqlSandbox(): Promise<ivm.Context> {
	if (sandboxContext && sandboxIsolate && !sandboxIsolate.isDisposed) {
		return sandboxContext;
	}

	sandboxIsolate = new ivm.Isolate({ memoryLimit: 64 }); // 64 MB hard limit
	sandboxContext = await sandboxIsolate.createContext();

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
	context: ivm.Context,
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
