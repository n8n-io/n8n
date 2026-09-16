import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import path from 'node:path';

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

// The optional leading backslash makes this idempotent for hand-escaped selectors.
export function escapeBracketsAndParens(fileSelector: string) {
	return fileSelector.replace(/\\?([()[\]])/g, '\\$1');
}
