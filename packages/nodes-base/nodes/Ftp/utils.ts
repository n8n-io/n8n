import type sftpClient from 'ssh2-sftp-client';

/**
 * Attempt POSIX rename first (atomic, uses posix-rename@openssh.com extension),
 * then fall back to basic SFTP v3 rename if the extension is not available.
 *
 * POSIX rename provides reliable atomic semantics that work correctly on servers
 * like Synology NAS, whereas the basic SFTP v3 SSH_FXP_RENAME can leave behind
 * temporary files on certain server implementations.
 */
export async function sftpRenameWithPosixFallback(
	sftp: sftpClient,
	oldPath: string,
	newPath: string,
): Promise<void> {
	try {
		await sftp.posixRename(oldPath, newPath);
	} catch (posixError) {
		const message = posixError instanceof Error ? posixError.message : String(posixError);
		if (message.includes('does not support this extended request')) {
			await sftp.rename(oldPath, newPath);
		} else {
			throw posixError;
		}
	}
}
