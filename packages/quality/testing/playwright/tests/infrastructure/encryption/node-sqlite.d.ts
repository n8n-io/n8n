// The installed @types/node predates the node:sqlite module (available at
// runtime since Node 22.5; engines require >= 24). Remove when @types/node
// ships the built-in declaration.
declare module 'node:sqlite' {
	export class DatabaseSync {
		constructor(path: string, options?: { readOnly?: boolean; timeout?: number });
		prepare(sql: string): { all(): unknown[] };
		close(): void;
	}
}
