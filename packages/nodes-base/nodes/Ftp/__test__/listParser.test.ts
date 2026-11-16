import { createRequire } from 'node:module';

// promise-ftp parses LIST output with @icetee/ftp. A pnpm patch makes that parser use native RegExp.
const requireFromPromiseFtp = createRequire(createRequire(__filename).resolve('promise-ftp'));
const { parseListEntry } = requireFromPromiseFtp('@icetee/ftp/lib/parser') as {
	parseListEntry: (line: string) => unknown;
};

describe('FTP LIST parser', () => {
	it('parses a Unix file entry', () => {
		expect(
			parseListEntry('-rw-r--r--+   1 ftp      ftp      12345678 Mar  3  2021 archive 2021.tar.gz'),
		).toEqual({
			type: '-',
			name: 'archive 2021.tar.gz',
			target: undefined,
			sticky: false,
			rights: { user: 'rw', group: 'r', other: 'r' },
			acl: true,
			owner: 'ftp',
			group: 'ftp',
			size: 12345678,
			date: new Date('2021-03-03'),
		});
	});

	it('parses a Unix symbolic link with a sticky bit', () => {
		expect(
			parseListEntry('lrwxrwxrwt    1 root     root            7 Feb  1  2024 latest -> v2.1.0'),
		).toMatchObject({
			type: 'l',
			name: 'latest',
			target: 'v2.1.0',
			sticky: true,
			rights: { user: 'rwx', group: 'rwx', other: 'rwx' },
		});
	});

	it('parses an MS-DOS directory entry', () => {
		expect(parseListEntry('10-07-26  02:15PM       <DIR>          Reports')).toEqual({
			name: 'Reports',
			type: 'd',
			size: 0,
			date: new Date(2026, 9, 7, 14, 15),
		});
	});

	it('returns a line that it cannot parse unchanged', () => {
		expect(parseListEntry('not a listing line')).toBe('not a listing line');
	});
});
