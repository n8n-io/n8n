import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestUrl } from 'n8n-workflow';
import { posix } from 'path';

import { updateDisplayOptions } from '@utils/utilities';

import {
	ITEM_PROPFIND_BODY,
	nextCloudApiRequest,
	nextCloudCredentialType,
	outputPath,
	readMultistatus,
	searchCondition,
	searchFiles,
	toWebDavItem,
	webDavPath,
} from '../../GenericFunctions';

const properties: INodeProperties[] = [
	{
		displayName: 'File to Update',
		name: 'file',
		type: 'resourceLocator',
		default: { mode: 'path', value: '' },
		required: true,
		modes: [
			{
				displayName: 'By Path',
				name: 'path',
				type: 'string',
				placeholder: 'e.g. /invoices/2019/invoice_1.pdf',
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 12345',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '\\d+',
							errorMessage: 'Not a valid file ID. A file ID is a number.',
						},
					},
				],
			},
		],
		description:
			'The file to update. A file ID is the fileId field that Search and Create From Text return.',
	},
	{
		displayName: 'New Content',
		name: 'newContent',
		type: 'options',
		default: 'keep',
		options: [
			{
				name: 'From Binary Field',
				value: 'binary',
				description: 'Replace the content with a file from an input binary field',
			},
			{
				name: 'From Text',
				value: 'text',
				description: 'Replace the content with text',
			},
			{
				name: 'Keep Current Content',
				value: 'keep',
			},
		],
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				newContent: ['text'],
			},
		},
		description: 'The text to write to the file',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				newContent: ['binary'],
			},
		},
		hint: 'The name of the input binary field that holds the new content',
	},
	{
		displayName: 'New File Name',
		name: 'newFileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. report.pdf',
		description: 'The new name of the file, in the same folder. Leave empty to keep the name.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Only If ETag Matches',
				name: 'eTag',
				type: 'string',
				default: '',
				placeholder: 'e.g. 5d2c0e1b9a7d3',
				description:
					'Update the file only if it still has this ETag. Use the eTag field of an earlier Nextcloud step, so the node stops instead of replacing changes that someone made since.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

const isPreconditionFailed = (error: unknown) =>
	error instanceof NodeApiError && error.httpCode === '412';

async function readItem(this: IExecuteFunctions, path: string) {
	const [response] = await readMultistatus(
		await nextCloudApiRequest.call(this, 'PROPFIND', webDavPath(path), ITEM_PROPFIND_BODY, {
			'Content-Type': 'application/xml',
			Depth: '0',
		}),
	);
	return toWebDavItem(response);
}

async function findFile(this: IExecuteFunctions, file: INodeParameterResourceLocator, i: number) {
	const value = String(file.value ?? '');
	let item: IDataObject | undefined;

	if (file.mode === 'id') {
		const id = value.trim();
		// The resource locator does not check a value that comes from an expression
		if (!/^\d+$/.test(id)) {
			throw new NodeOperationError(this.getNode(), `"${id}" is not a valid file ID`, {
				itemIndex: i,
				description: 'A file ID is a number, like the fileId field that Search returns.',
			});
		}
		[item] = await searchFiles.call(this, [], searchCondition('eq', 'oc:fileid', id));
		if (!item) {
			throw new NodeOperationError(this.getNode(), `No file has the ID ${id}`, {
				itemIndex: i,
				description: 'The file may be deleted, or the credential cannot see it.',
			});
		}
	} else {
		try {
			item = await readItem.call(this, value);
		} catch (error) {
			if (error instanceof NodeApiError && error.httpCode === '404') {
				throw new NodeOperationError(
					this.getNode(),
					`The file "${outputPath(value)}" does not exist`,
					{
						itemIndex: i,
						description: 'Update changes only a file that exists. Use Upload to create a file.',
					},
				);
			}
			throw error;
		}
	}

	if (item.type === 'folder') {
		throw new NodeOperationError(this.getNode(), `"${String(item.path)}" is a folder, not a file`, {
			itemIndex: i,
		});
	}
	return item;
}

async function readNewContent(this: IExecuteFunctions, i: number) {
	const newContent = this.getNodeParameter('newContent', i, 'keep') as 'binary' | 'text' | 'keep';
	if (newContent === 'keep') return undefined;
	if (newContent === 'text') {
		return this.getNodeParameter('fileContent', i, '', { ensureType: 'string' }) as string;
	}

	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
	this.helpers.assertBinaryData(i, binaryPropertyName);
	return await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
}

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const file = this.getNodeParameter('file', i) as INodeParameterResourceLocator;
	const newFileName = String(this.getNodeParameter('newFileName', i, '') ?? '');
	const options = this.getNodeParameter('options', i, {}) as { eTag?: string };
	const expectedETag = options.eTag?.trim().replace(/^"|"$/g, '');

	if (newFileName.includes('/')) {
		throw new NodeOperationError(this.getNode(), 'The new file name cannot contain "/"', {
			itemIndex: i,
			description: 'Update renames the file in its folder. Use Move to put it in another folder.',
		});
	}

	// Read the content before changing anything, so a missing binary field stops the node before a rename
	const content = await readNewContent.call(this, i);

	const current = await findFile.call(this, file, i);
	const currentPath = String(current.path);
	const currentETag = String(current.eTag);

	if (expectedETag && expectedETag !== currentETag) {
		throw new NodeOperationError(
			this.getNode(),
			`The file "${currentPath}" has changed: its ETag is no longer "${expectedETag}"`,
			{
				itemIndex: i,
				description: 'Nothing was changed. Get the file again to use its current ETag.',
			},
		);
	}

	let path = currentPath;

	if (newFileName && newFileName !== posix.basename(currentPath)) {
		// Not posix.join, which turns "." and ".." into the parent path before webDavPath can reject them
		path = outputPath(`${posix.dirname(currentPath)}/${newFileName}`);
		const { webDavUrl } = await this.getCredentials<{ webDavUrl: string }>(
			nextCloudCredentialType.call(this),
		);
		try {
			await nextCloudApiRequest.call(this, 'MOVE', webDavPath(currentPath), '', {
				Destination: requestUrl`${webDavUrl}${webDavPath(path)}`.toString(),
				// Without this header, Nextcloud replaces a file that already has the new name
				Overwrite: 'F',
			});
		} catch (error) {
			if (isPreconditionFailed(error)) {
				throw new NodeOperationError(
					this.getNode(),
					`The folder already has a file or folder named "${newFileName}"`,
					{
						itemIndex: i,
						description: `Nothing was changed. Choose another name for "${currentPath}".`,
					},
				);
			}
			throw error;
		}
	}

	if (content !== undefined) {
		try {
			// The file must exist: the lookup above fails on a missing file, and If-Match stops the PUT
			// from creating it again if it is deleted in between. A rename keeps the ETag.
			await nextCloudApiRequest.call(this, 'PUT', webDavPath(path), content, {
				'If-Match': `"${currentETag}"`,
			});
		} catch (error) {
			const changed = isPreconditionFailed(error);
			if (!changed && path === currentPath) throw error;
			// After a rename the old path is gone, so the user needs the new one to try again
			throw new NodeOperationError(
				this.getNode(),
				changed
					? `The file "${path}" changed or was deleted while the node was updating it`
					: ensureError(error),
				{
					itemIndex: i,
					description:
						path === currentPath
							? 'The content was not replaced. Run the node again.'
							: `The file was renamed to "${path}", but its content was not replaced. Update it at that path.`,
				},
			);
		}
	}

	if (path === currentPath && content === undefined) return current;

	try {
		return await readItem.call(this, path);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Updated the file "${path}", but could not read its details`,
			{ itemIndex: i, description: ensureError(error).message },
		);
	}
}
