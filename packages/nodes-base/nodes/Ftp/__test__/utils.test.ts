import type sftp from 'ssh2-sftp-client';

import { sftpRenameWithPosixFallback } from '../utils';

describe('sftpRenameWithPosixFallback', () => {
	let posixRename: jest.Mock;
	let rename: jest.Mock;
	let sftpClient: sftp;

	beforeEach(() => {
		posixRename = jest.fn();
		rename = jest.fn();
		sftpClient = { posixRename, rename } as unknown as sftp;
	});

	it('should use posixRename when the server supports the extension', async () => {
		posixRename.mockResolvedValue('OK');

		await sftpRenameWithPosixFallback(sftpClient, '/src/file.txt', '/dst/file.txt');

		expect(posixRename).toHaveBeenCalledWith('/src/file.txt', '/dst/file.txt');
		expect(rename).not.toHaveBeenCalled();
	});

	it('should fall back to rename when posixRename extension is not supported', async () => {
		posixRename.mockRejectedValue(new Error('Server does not support this extended request'));
		rename.mockResolvedValue('OK');

		await sftpRenameWithPosixFallback(sftpClient, '/src/file.txt', '/dst/file.txt');

		expect(posixRename).toHaveBeenCalledWith('/src/file.txt', '/dst/file.txt');
		expect(rename).toHaveBeenCalledWith('/src/file.txt', '/dst/file.txt');
	});

	it('should propagate posixRename errors that are not about extension support', async () => {
		posixRename.mockRejectedValue(new Error('Permission denied'));

		await expect(
			sftpRenameWithPosixFallback(sftpClient, '/src/file.txt', '/dst/file.txt'),
		).rejects.toThrow('Permission denied');

		expect(posixRename).toHaveBeenCalledWith('/src/file.txt', '/dst/file.txt');
		expect(rename).not.toHaveBeenCalled();
	});

	it('should propagate non-Error exceptions from posixRename', async () => {
		posixRename.mockRejectedValue('unexpected string error');

		await expect(
			sftpRenameWithPosixFallback(sftpClient, '/src/file.txt', '/dst/file.txt'),
		).rejects.toBe('unexpected string error');

		expect(rename).not.toHaveBeenCalled();
	});

	it('should propagate errors from the fallback rename call', async () => {
		posixRename.mockRejectedValue(new Error('Server does not support this extended request'));
		rename.mockRejectedValue(new Error('No such file'));

		await expect(
			sftpRenameWithPosixFallback(sftpClient, '/src/file.txt', '/dst/file.txt'),
		).rejects.toThrow('No such file');
	});

	it('should handle paths with special characters', async () => {
		posixRename.mockResolvedValue('OK');

		await sftpRenameWithPosixFallback(
			sftpClient,
			'/path/with spaces/file (1).txt',
			'/target/path/new name.txt',
		);

		expect(posixRename).toHaveBeenCalledWith(
			'/path/with spaces/file (1).txt',
			'/target/path/new name.txt',
		);
	});
});
