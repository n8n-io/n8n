import { beforeEach, describe, expect, test } from 'vitest';

import { FakeFsError, InMemoryFileSystem, normalizePath } from '../fake-sandbox.fs';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const T1 = new Date('2026-01-01T00:00:01.000Z');

function text(value: string): Buffer {
	return Buffer.from(value, 'utf8');
}

/** Run `run` and describe the `FakeFsError` that it throws. Return 'no error' or the other error. */
function fsError(run: () => unknown): unknown {
	try {
		run();
	} catch (error) {
		return error instanceof FakeFsError ? { status: error.status, message: error.message } : error;
	}
	return 'no error';
}

let clock: Date;
let fs: InMemoryFileSystem;

beforeEach(() => {
	clock = T0;
	fs = new InMemoryFileSystem(() => clock);
});

describe('normalizePath', () => {
	const cases = [
		['/home/user/a.txt', '/home/user/a.txt'],
		['home/user', '/home/user'],
		['/home//user/./a/../b', '/home/user/b'],
		['/home/user/', '/home/user'],
		['/', '/'],
	] as const;
	for (const [input, output] of cases) {
		test(`turns "${input}" into "${output}"`, () => {
			expect(normalizePath(input)).toBe(output);
		});
	}

	for (const input of ['', '   ']) {
		test(`rejects the empty path "${input}" with 400`, () => {
			expect(fsError(() => normalizePath(input))).toEqual({
				status: 400,
				message: 'A path is required',
			});
		});
	}
});

describe('InMemoryFileSystem', () => {
	test('reads back a written file and creates its parent directories', () => {
		fs.writeFile('/home/user/workspace/skills/a.md', text('# A'));

		expect(fs.readFile('/home/user/workspace/skills/a.md').toString()).toBe('# A');
		expect(fs.stat('/home/user/workspace/skills').type).toBe('directory');
		expect(fs.list('/home/user').map((entry) => entry.name)).toEqual(['workspace']);
	});

	test('overwrites a file by default and keeps its creation time', () => {
		fs.writeFile('/a.txt', text('one'));
		clock = T1;

		fs.writeFile('/a.txt', text('two'));

		expect(fs.readFile('/a.txt').toString()).toBe('two');
		expect(fs.stat('/a.txt')).toMatchObject({
			created_at: T0.toISOString(),
			modified_at: T1.toISOString(),
		});
	});

	test('refuses to overwrite a file when overwrite is false', () => {
		fs.writeFile('/a.txt', text('one'));

		expect(fsError(() => fs.writeFile('/a.txt', text('two'), false))).toEqual({
			status: 409,
			message: '/a.txt already exists',
		});
		expect(fs.readFile('/a.txt').toString()).toBe('one');
	});

	test('writes a new file when overwrite is false', () => {
		fs.writeFile('/new.txt', text('one'), false);

		expect(fs.readFile('/new.txt').toString()).toBe('one');
	});

	test('refuses to write a file over a directory', () => {
		fs.mkdir('/dir');

		expect(fsError(() => fs.writeFile('/dir', text('x')))).toEqual({
			status: 409,
			message: '/dir is a directory',
		});
	});

	test('refuses to write below a file', () => {
		fs.writeFile('/a.txt', text('x'));

		expect(fsError(() => fs.writeFile('/a.txt/b.txt', text('y')))).toEqual({
			status: 409,
			message: '/a.txt is a file',
		});
		expect(fsError(() => fs.writeFile('/a.txt/c/d.txt', text('y')))).toEqual({
			status: 409,
			message: '/a.txt is a file',
		});
		expect(() => fs.stat('/a.txt/c')).toThrow('/a.txt/c does not exist');
	});

	test('appends to a file, and creates it when it is missing', () => {
		fs.appendFile('/log.txt', text('a'));
		fs.appendFile('/log.txt', text('b'));

		expect(fs.readFile('/log.txt').toString()).toBe('ab');
	});

	test('refuses to append to a directory', () => {
		fs.mkdir('/dir');

		expect(fsError(() => fs.appendFile('/dir', text('x')))).toEqual({
			status: 409,
			message: '/dir is a directory',
		});
	});

	test('answers 404 for a missing file and 409 for a directory read', () => {
		fs.mkdir('/dir');

		expect(fsError(() => fs.readFile('/missing.txt'))).toEqual({
			status: 404,
			message: '/missing.txt does not exist',
		});
		expect(fsError(() => fs.readFile('/dir'))).toEqual({
			status: 409,
			message: '/dir is not a file',
		});
	});

	describe('mkdir', () => {
		test('creates one directory in an existing parent', () => {
			fs.mkdir('/a');

			expect(fs.stat('/a')).toMatchObject({ name: 'a', path: '/a', type: 'directory', size: 0 });
		});

		test('needs `recursive` for missing parents', () => {
			expect(fsError(() => fs.mkdir('/a/b/c'))).toEqual({
				status: 404,
				message: '/a/b does not exist',
			});

			fs.mkdir('/a/b/c', true);

			expect(fs.list('/', true).map((entry) => entry.name)).toEqual(['a', 'a/b', 'a/b/c']);
		});

		test('keeps an existing directory and its files', () => {
			fs.writeFile('/a/file.txt', text('x'));

			fs.mkdir('/a');

			expect(fs.readFile('/a/file.txt').toString()).toBe('x');
		});

		test('refuses a path that is a file, or a parent that is a file', () => {
			fs.writeFile('/a.txt', text('x'));

			expect(fsError(() => fs.mkdir('/a.txt'))).toEqual({
				status: 409,
				message: '/a.txt is a file',
			});
			expect(fsError(() => fs.mkdir('/a.txt/b'))).toEqual({
				status: 409,
				message: '/a.txt is not a directory',
			});
			expect(fsError(() => fs.mkdir('/a.txt/b/c', true))).toEqual({
				status: 409,
				message: '/a.txt is a file',
			});
		});
	});

	describe('remove', () => {
		test('removes a file', () => {
			fs.writeFile('/a.txt', text('x'));

			fs.remove('/a.txt');

			expect(fsError(() => fs.stat('/a.txt'))).toEqual({
				status: 404,
				message: '/a.txt does not exist',
			});
		});

		test('removes an empty directory without `recursive`', () => {
			fs.mkdir('/empty');

			fs.remove('/empty');

			expect(fs.list('/')).toEqual([]);
		});

		test('needs `recursive` for a directory with content', () => {
			fs.writeFile('/dir/sub/a.txt', text('x'));
			fs.writeFile('/dirx.txt', text('keep'));

			expect(fsError(() => fs.remove('/dir'))).toEqual({
				status: 409,
				message: '/dir is not empty',
			});

			fs.remove('/dir', { recursive: true });

			expect(fs.list('/', true).map((entry) => entry.name)).toEqual(['dirx.txt']);
		});

		test('answers 404 for a missing path unless `force` is set', () => {
			expect(fsError(() => fs.remove('/missing'))).toEqual({
				status: 404,
				message: '/missing does not exist',
			});
			expect(() => fs.remove('/missing', { force: true })).not.toThrow();
		});

		test('refuses to remove the root directory', () => {
			expect(fsError(() => fs.remove('/', { recursive: true, force: true }))).toEqual({
				status: 400,
				message: 'The root directory cannot be removed',
			});
		});
	});

	describe('list', () => {
		beforeEach(() => {
			fs.writeFile('/w/b.txt', text('bb'));
			fs.writeFile('/w/a/c.txt', text('ccc'));
			fs.writeFile('/w2/other.txt', text('o'));
		});

		test('lists the direct children in name order', () => {
			expect(fs.list('/w')).toEqual([
				{ name: 'a', size: 0, is_dir: true, type: 'directory', mod_time: T0.toISOString() },
				{ name: 'b.txt', size: 2, is_dir: false, type: 'file', mod_time: T0.toISOString() },
			]);
		});

		test('lists all descendants with relative names when `recursive` is set', () => {
			expect(fs.list('/w', true).map((entry) => [entry.name, entry.size])).toEqual([
				['a', 0],
				['a/c.txt', 3],
				['b.txt', 2],
			]);
		});

		test('lists the root', () => {
			expect(fs.list('/').map((entry) => entry.name)).toEqual(['w', 'w2']);
		});

		test('answers 404 for a missing directory and 409 for a file', () => {
			expect(fsError(() => fs.list('/missing'))).toEqual({
				status: 404,
				message: '/missing does not exist',
			});
			expect(fsError(() => fs.list('/w/b.txt'))).toEqual({
				status: 409,
				message: '/w/b.txt is not a directory',
			});
		});
	});

	describe('stat', () => {
		test('describes a file', () => {
			fs.writeFile('/w/b.txt', text('bb'));

			expect(fs.stat('w/./b.txt')).toEqual({
				name: 'b.txt',
				path: '/w/b.txt',
				type: 'file',
				size: 2,
				created_at: T0.toISOString(),
				modified_at: T0.toISOString(),
			});
		});

		test('describes the root', () => {
			expect(fs.stat('/')).toMatchObject({ name: '/', path: '/', type: 'directory' });
		});
	});

	test('uses the real clock by default', () => {
		const before = Date.now();
		const realFs = new InMemoryFileSystem();
		realFs.writeFile('/a.txt', text('x'));

		const created = Date.parse(realFs.stat('/a.txt').created_at);

		expect(created).toBeGreaterThanOrEqual(before);
		expect(created).toBeLessThanOrEqual(Date.now());
	});
});
