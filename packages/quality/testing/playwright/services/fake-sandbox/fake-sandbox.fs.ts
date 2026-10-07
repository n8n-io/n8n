import { UserError } from 'n8n-workflow';
import { posix } from 'node:path';

/** A file system error with the HTTP status that the fake sandbox service sends. */
export class FakeFsError extends UserError {
	constructor(
		readonly status: 400 | 404 | 409,
		message: string,
	) {
		super(message);
	}
}

export type FakeFileType = 'file' | 'directory';

/** One entry of `GET /sandboxes/:id/files`, in the shape of the n8n sandbox service. */
export type FakeFileEntry = {
	name: string;
	size: number;
	is_dir: boolean;
	type: FakeFileType;
	mod_time: string;
};

/** The body of `GET /sandboxes/:id/stat`, in the shape of the n8n sandbox service. */
export type FakeFileStat = {
	name: string;
	path: string;
	type: FakeFileType;
	size: number;
	created_at: string;
	modified_at: string;
};

type FsNode = {
	type: FakeFileType;
	content: Buffer;
	createdAt: Date;
	modifiedAt: Date;
};

const ROOT = '/';

/** Make a path absolute and remove `.`, `..` and repeated slashes. */
export function normalizePath(path: string): string {
	if (path.trim() === '') throw new FakeFsError(400, 'A path is required');
	return posix.resolve(ROOT, path);
}

function isInside(path: string, directory: string): boolean {
	return directory === ROOT ? path !== ROOT : path.startsWith(`${directory}/`);
}

/** A small in-memory file system for one fake sandbox. Paths are POSIX paths. */
export class InMemoryFileSystem {
	private readonly nodes = new Map<string, FsNode>();

	constructor(private readonly now: () => Date = () => new Date()) {
		this.nodes.set(ROOT, this.createNode('directory', Buffer.alloc(0)));
	}

	/** Write a file and create its parent directories. */
	writeFile(path: string, content: Buffer, overwrite = true): void {
		const target = normalizePath(path);
		const existing = this.nodes.get(target);
		if (existing?.type === 'directory') throw new FakeFsError(409, `${target} is a directory`);
		if (existing && !overwrite) throw new FakeFsError(409, `${target} already exists`);
		this.createDirectories(posix.dirname(target));
		const node = this.createNode('file', content);
		this.nodes.set(target, existing ? { ...node, createdAt: existing.createdAt } : node);
	}

	appendFile(path: string, content: Buffer): void {
		const current = this.nodes.get(normalizePath(path));
		const previous = current?.type === 'file' ? current.content : Buffer.alloc(0);
		this.writeFile(path, Buffer.concat([previous, content]));
	}

	readFile(path: string): Buffer {
		return this.requireNode(normalizePath(path), 'file').content;
	}

	/** Create a directory. Keep an existing directory. Refuse an existing file (409). */
	mkdir(path: string, recursive = false): void {
		const target = normalizePath(path);
		if (!recursive) this.requireNode(posix.dirname(target), 'directory');
		this.createDirectories(target);
	}

	remove(path: string, options: { recursive?: boolean; force?: boolean } = {}): void {
		const target = normalizePath(path);
		if (target === ROOT) throw new FakeFsError(400, 'The root directory cannot be removed');
		if (!this.nodes.has(target)) {
			if (options.force) return;
			throw new FakeFsError(404, `${target} does not exist`);
		}
		const children = this.pathsInside(target);
		if (children.length > 0 && !options.recursive) {
			throw new FakeFsError(409, `${target} is not empty`);
		}
		for (const child of children) this.nodes.delete(child);
		this.nodes.delete(target);
	}

	list(path: string, recursive = false): FakeFileEntry[] {
		const target = normalizePath(path);
		this.requireNode(target, 'directory');
		return this.pathsInside(target)
			.filter((child) => recursive || posix.dirname(child) === target)
			.sort()
			.map((child) => this.toEntry(child, recursive ? posix.relative(target, child) : undefined));
	}

	stat(path: string): FakeFileStat {
		const target = normalizePath(path);
		const node = this.requireNode(target);
		return {
			name: posix.basename(target) || ROOT,
			path: target,
			type: node.type,
			size: node.content.length,
			created_at: node.createdAt.toISOString(),
			modified_at: node.modifiedAt.toISOString(),
		};
	}

	private createNode(type: FakeFileType, content: Buffer): FsNode {
		const time = this.now();
		return { type, content, createdAt: time, modifiedAt: time };
	}

	/** Create `directory` and its missing parents. The root always exists, so the walk ends. */
	private createDirectories(directory: string): void {
		const missing: string[] = [];
		let ancestor = directory;
		let node = this.nodes.get(ancestor);
		while (!node) {
			missing.unshift(ancestor);
			ancestor = posix.dirname(ancestor);
			node = this.nodes.get(ancestor);
		}
		if (node.type === 'file') throw new FakeFsError(409, `${ancestor} is a file`);
		for (const path of missing) this.nodes.set(path, this.createNode('directory', Buffer.alloc(0)));
	}

	private requireNode(path: string, type?: FakeFileType): FsNode {
		const node = this.nodes.get(path);
		if (!node) throw new FakeFsError(404, `${path} does not exist`);
		if (type && node.type !== type) throw new FakeFsError(409, `${path} is not a ${type}`);
		return node;
	}

	private pathsInside(directory: string): string[] {
		return [...this.nodes.keys()].filter((path) => isInside(path, directory));
	}

	private toEntry(path: string, relativeName?: string): FakeFileEntry {
		const node = this.requireNode(path);
		return {
			name: relativeName ?? posix.basename(path),
			size: node.content.length,
			is_dir: node.type === 'directory',
			type: node.type,
			mod_time: node.modifiedAt.toISOString(),
		};
	}
}
