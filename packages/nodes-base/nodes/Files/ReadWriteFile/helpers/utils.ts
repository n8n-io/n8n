import glob from 'fast-glob';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

import type { GlobWorkerData, GlobWorkerResponse } from './glob.worker';

export function errorMapper(
	this: IExecuteFunctions,
	error: Error,
	itemIndex: number,
	context?: IDataObject,
) {
	let message;
	let description;

	if (typeof error.message === 'string') {
		if (error.message.includes('Cannot create a string longer than')) {
			message = 'The file is too large';
			description =
				'The binary file you are attempting to read exceeds 512MB, which is limit when using default binary data mode, try using the filesystem binary mode. More information <a href="https://docs.n8n.io/hosting/scaling/binary-data/" target="_blank">here</a>.';
		} else if (error.message.includes('EACCES') && context?.operation === 'read') {
			const path =
				((error as unknown as IDataObject).path as string) || (context?.filePath as string);
			message = `You don't have the permissions to access ${path}`;
			description =
				"Verify that the path specified in 'File(s) Selector' is correct, or change the file(s) permissions if needed";
		} else if (error.message.includes('EACCES') && context?.operation === 'write') {
			const path =
				((error as unknown as IDataObject).path as string) || (context?.filePath as string);
			message = `You don't have the permissions to write the file ${path}`;
			description =
				"Specify another destination folder in 'File Path and Name', or change the permissions of the parent folder";
		}
	}

	return new NodeOperationError(this.getNode(), error, { itemIndex, message, description });
}

const WINDOWS_DRIVE_PREFIX = /^[a-zA-Z]:/;
// The backslash after the drive letter is always a separator; elsewhere one is a
// separator unless it escapes a character the option governs, so forward-slash
// selectors keep escapes. Only `()[]` qualify — the node never escapes anything
// else, so a backslash before `{`, `}` or `!` is a separator.
const HAS_BACKSLASH_SEPARATOR = /^[a-zA-Z]:\\|\\(?![()[\]])/;

export function normalizeFileSelector(fileSelectorRaw: string) {
	const fileSelector = String(fileSelectorRaw);

	if (!WINDOWS_DRIVE_PREFIX.test(fileSelector)) return fileSelector;

	// posix.normalize collapses `..` and `//` the same way, but leaves `\` alone
	return HAS_BACKSLASH_SEPARATOR.test(fileSelector)
		? path.win32.normalize(fileSelector).replace(/\\/g, '/')
		: path.posix.normalize(fileSelector);
}

// Matching a free-form selector can cost far more than the files it returns —
// e.g. many `*` in one segment, or a deep `**` walk. Run it off the main event
// loop so a slow selector can be bounded and terminated, keeping the instance
// responsive. One budget covers a whole node execution (see read.operation),
// and it counts glob time only, so file reads between items never spend it.
export const GLOB_TIMEOUT_MS = 10_000;

// Compiled output is `helpers/utils.js`, with `glob.worker.js` beside it. Under
// Vitest the source `.ts` runs, whose sibling `.js` is absent, so fall back to
// the build output (the package is built before tests run). `lastIndexOf` keeps
// the mapping correct even when a parent directory is also named `nodes`.
function resolveGlobWorkerPath() {
	const { dir } = path.parse(__filename);
	const sibling = path.join(dir, 'glob.worker.js');
	if (existsSync(sibling)) return sibling;

	const marker = `${path.sep}nodes${path.sep}`;
	const at = dir.lastIndexOf(marker);
	const distDir = `${dir.slice(0, at)}${path.sep}dist${dir.slice(at)}`;
	return path.join(distDir, 'glob.worker.js');
}

function tooComplexError(node: INode, itemIndex: number) {
	return new NodeOperationError(node, 'File(s) Selector is too complex', {
		itemIndex,
		description:
			'The selector took too long to evaluate. Use a more specific pattern with fewer wildcards.',
	});
}

const MAX_MAIN_THREAD_WILDCARDS = 2;

// A whitelist fast path, never a security check: it only returns true for a
// selector that provably cannot backtrack or recurse, so the match is safe to
// run inline and skip the worker. Anything with glob syntax we would have to
// parse — braces, parens/extglob, classes, escapes, `!`, or a `**` globstar —
// falls through to the worker instead, as does more than a couple of `*`. `?`
// is fixed-width, so its count is irrelevant.
export function isTriviallyCheapSelector(selector: string): boolean {
	if (selector.includes('**')) return false;
	if (/[{}()[\]\\!]/.test(selector)) return false;
	return (selector.match(/\*/g)?.length ?? 0) <= MAX_MAIN_THREAD_WILDCARDS;
}

export async function globWithDeadline(
	node: INode,
	pattern: string,
	options: glob.Options = {},
	itemIndex = 0,
	budgetMs = GLOB_TIMEOUT_MS,
): Promise<string[]> {
	// Plain selectors run inline; only the rest pay for a worker and a deadline.
	if (isTriviallyCheapSelector(pattern)) return await glob(pattern, options);

	if (budgetMs <= 0) throw tooComplexError(node, itemIndex);

	const worker = new Worker(resolveGlobWorkerPath(), {
		workerData: { pattern, options } satisfies GlobWorkerData,
	});
	let timer: NodeJS.Timeout | undefined;

	try {
		return await new Promise<string[]>((resolve, reject) => {
			timer = setTimeout(() => reject(tooComplexError(node, itemIndex)), budgetMs);
			worker.once('message', (response: GlobWorkerResponse) => {
				if (response.ok) return resolve(response.files);
				// Reattach `code`/`path` so errorMapper and NodeApiError see the real values.
				const error = new Error(response.error.message) as NodeJS.ErrnoException;
				error.code = response.error.code;
				error.path = response.error.path;
				reject(error);
			});
			worker.once('error', reject);
			worker.once('exit', (code) => {
				if (code !== 0) reject(new Error(`Glob worker stopped with exit code ${code}`));
			});
		});
	} finally {
		if (timer) clearTimeout(timer);
		// Fire-and-forget: tear the thread down without blocking the result or
		// letting a terminate rejection mask the real outcome.
		void worker.terminate().catch(() => {});
	}
}

// The optional leading backslash makes this idempotent for hand-escaped selectors.
export function escapeBracketsAndParens(fileSelector: string) {
	return fileSelector.replace(/\\?([()[\]])/g, '\\$1');
}
