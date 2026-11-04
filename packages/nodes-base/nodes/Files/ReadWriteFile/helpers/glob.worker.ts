import glob from 'fast-glob';
import { parentPort, workerData } from 'node:worker_threads';

// Runs the glob walk off the main event loop so the parent can cap it with a
// deadline and terminate this thread if it runs long. Only path strings cross
// back, so the result stays serializable.
export interface GlobWorkerData {
	pattern: string;
	options: glob.Options;
}

// `code`/`path` are carried so the parent can rebuild the error and keep
// `errorMapper`'s permission message pointing at the real path, not the selector.
export type GlobWorkerError = { message: string; code?: string; path?: string };

export type GlobWorkerResponse =
	| { ok: true; files: string[] }
	| { ok: false; error: GlobWorkerError };

const { pattern, options } = workerData as GlobWorkerData;

glob(pattern, options)
	.then((files) => parentPort?.postMessage({ ok: true, files } satisfies GlobWorkerResponse))
	.catch((error: unknown) => {
		const errno = error as NodeJS.ErrnoException;
		parentPort?.postMessage({
			ok: false,
			error: {
				message: error instanceof Error ? error.message : String(error),
				code: errno?.code,
				path: errno?.path,
			},
		} satisfies GlobWorkerResponse);
	});
