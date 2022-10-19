import { IExecuteFunctions } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import { basename, dirname } from 'path';

import ftpClient from 'promise-ftp';
import sftpClient from 'ssh2-sftp-client';

interface ReturnFtpItem {
	type: string;
	name: string;
	size: number;
	accessTime: Date;
	modifyTime: Date;
	rights: {
		user: string;
		group: string;
		other: string;
	};
	owner: string | number;
	group: string | number;
	target: string;
	sticky?: boolean;
	path: string;
}

export class Ftp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FTP',
		name: 'ftp',
		icon: 'fa:server',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["protocol"] + ": " + $parameter["operation"]}}',
		description: 'Transfers files via FTP or SFTP',
		defaults: {
			name: 'FTP',
			color: '#303050',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				// nodelinter-ignore-next-line
				name: 'ftp',
				required: true,
				displayOptions: {
					show: {
						protocol: ['ftp'],
					},
				},
				testedBy: 'ftpConnectionTest',
			},
			{
				// nodelinter-ignore-next-line
				name: 'sftp',
				required: true,
				displayOptions: {
					show: {
						protocol: ['sftp'],
					},
				},
				testedBy: 'sftpConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Protocol',
				name: 'protocol',
				type: 'options',
				options: [
					{
						name: 'FTP',
						value: 'ftp',
					},
					{
						name: 'SFTP',
						value: 'sftp',
					},
				],
				default: 'ftp',
				description: 'File transfer protocol',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file/folder',
						action: 'Delete a file or folder',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
						action: 'Download a file',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List folder content',
						action: 'List folder content',
					},
					{
						name: 'Rename',
						value: 'rename',
						description: 'Rename/move oldPath to newPath',
						action: 'Rename / move a file or folder',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file',
						action: 'Upload a file',
					},
				],
				default: 'download',
				noDataExpression: true,
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				description: 'The file path of the file to delete. Has to contain the full path.',
				required: true,
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Folder',
						name: 'folder',
						type: 'boolean',
						default: false,
						description: 'Whether folders can be deleted',
					},
					{
						displayName: 'Recursive',
						displayOptions: {
							show: {
								folder: [true],
							},
						},
						name: 'recursive',
						type: 'boolean',
						default: false,
						description: 'Whether to remove all files and directories in target directory',
					},
				],
			},

			// ----------------------------------
			//         download
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['download'],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				placeholder: '/documents/invoice.txt',
				description: 'The file path of the file to download. Has to contain the full path.',
				required: true,
			},
			{
				displayName: 'Binary Property',
				displayOptions: {
					show: {
						operation: ['download'],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data',
				required: true,
			},

			// ----------------------------------
			//         rename
			// ----------------------------------
			{
				displayName: 'Old Path',
				displayOptions: {
					show: {
						operation: ['rename'],
					},
				},
				name: 'oldPath',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'New Path',
				displayOptions: {
					show: {
						operation: ['rename'],
					},
				},
				name: 'newPath',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['rename'],
					},
				},
				options: [
					{
						displayName: 'Create Directories',
						name: 'createDirectories',
						type: 'boolean',
						default: false,
						description:
							'Whether to recursively create destination directory when renaming an existing file or folder',
					},
				],
			},

			// ----------------------------------
			//         upload
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['upload'],
					},
				},
				name: 'path',
				type: 'string',
				default: '',
				description: 'The file path of the file to upload. Has to contain the full path.',
				required: true,
			},
			{
				displayName: 'Binary Data',
				displayOptions: {
					show: {
						operation: ['upload'],
					},
				},
				name: 'binaryData',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'The text content of the file to upload',
			},
			{
				displayName: 'Binary Property',
				displayOptions: {
					show: {
						operation: ['upload'],
						binaryData: [true],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data',
				required: true,
			},
			{
				displayName: 'File Content',
				displayOptions: {
					show: {
						operation: ['upload'],
						binaryData: [false],
					},
				},
				name: 'fileContent',
				type: 'string',
				default: '',
				description: 'The text content of the file to upload',
			},

			// ----------------------------------
			//         list
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				name: 'path',
				type: 'string',
				default: '/',
				description: 'Path of directory to list contents of',
				required: true,
			},
			{
				displayName: 'Recursive',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				name: 'recursive',
				type: 'boolean',
				default: false,
				description:
					'Whether to return object representing all directories / objects recursively found within SFTP server',
				required: true,
			},
		],
	};

	methods = {
		credentialTest: {
			async ftpConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;
				try {
					let ftp: ftpClient;
					ftp = new ftpClient();
					await ftp.connect({
						host: credentials.host as string,
						port: credentials.port as number,
						user: credentials.username as string,
						password: credentials.password as string,
					});
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
			async sftpConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;
				try {
					let sftp: sftpClient;
					sftp = new sftpClient();
					await sftp.connect({
						host: credentials.host as string,
						port: credentials.port as number,
						username: credentials.username as string,
						password: credentials.password as string,
						privateKey: credentials.privateKey as string | undefined,
						passphrase: credentials.passphrase as string | undefined,
					});
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		// const returnData: IDataObject[] = [];
		const returnItems: INodeExecutionData[] = [];
		const qs: IDataObject = {};
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;

		let credentials: ICredentialDataDecryptedObject | undefined = undefined;
		const protocol = this.getNodeParameter('protocol', 0) as string;

		if (protocol === 'sftp') {
			credentials = await this.getCredentials('sftp');
		} else {
			credentials = await this.getCredentials('ftp');
		}
		try {
			let ftp: ftpClient;
			let sftp: sftpClient;

			if (protocol === 'sftp') {
				sftp = new sftpClient();
				await sftp.connect({
					host: credentials.host as string,
					port: credentials.port as number,
					username: credentials.username as string,
					password: credentials.password as string,
					privateKey: credentials.privateKey as string | undefined,
					passphrase: credentials.passphrase as string | undefined,
				});
			} else {
				ftp = new ftpClient();
				await ftp.connect({
					host: credentials.host as string,
					port: credentials.port as number,
					user: credentials.username as string,
					password: credentials.password as string,
				});
			}

			for (let i = 0; i < items.length; i++) {
				const newItem: INodeExecutionData = {
					json: items[i].json,
					binary: {},
				};

				if (items[i].binary !== undefined && newItem.binary) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, items[i].binary);
				}

				items[i] = newItem;

				if (protocol === 'sftp') {
					if (operation === 'list') {
						const path = this.getNodeParameter('path', i) as string;

						const recursive = this.getNodeParameter('recursive', i) as boolean;

						if (recursive) {
							responseData = await callRecursiveList(path, sftp!, normalizeSFtpItem);
							returnItems.push.apply(
								returnItems,
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
							);
						} else {
							responseData = await sftp!.list(path);
							responseData.forEach((item) => normalizeSFtpItem(item as sftpClient.FileInfo, path));
							returnItems.push.apply(
								returnItems,
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
							);
						}
					}

					if (operation === 'delete') {
						const path = this.getNodeParameter('path', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						if (options.folder === true) {
							responseData = await sftp!.rmdir(path, !!options.recursive);
						} else {
							responseData = await sftp!.delete(path);
						}

						returnItems.push({ json: { success: true } });
					}

					if (operation === 'rename') {
						const oldPath = this.getNodeParameter('oldPath', i) as string;
						const { createDirectories = false } = this.getNodeParameter('options', i) as {
							createDirectories: boolean;
						};
						const newPath = this.getNodeParameter('newPath', i) as string;

						if (createDirectories) {
							await recursivelyCreateSftpDirs(sftp!, newPath);
						}

						responseData = await sftp!.rename(oldPath, newPath);

						returnItems.push({ json: { success: true } });
					}

					if (operation === 'download') {
						const path = this.getNodeParameter('path', i) as string;

						responseData = await sftp!.get(path);

						const dataPropertyNameDownload = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;

						const filePathDownload = this.getNodeParameter('path', i) as string;
						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							responseData as Buffer,
							filePathDownload,
						);

						returnItems.push(items[i]);
					}

					if (operation === 'upload') {
						const remotePath = this.getNodeParameter('path', i) as string;
						await recursivelyCreateSftpDirs(sftp!, remotePath);

						if (this.getNodeParameter('binaryData', i) === true) {
							// Is binary file to upload
							const item = items[i];

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

							if (item.binary[propertyNameUpload] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${propertyNameUpload}" does not exists on item!`,
									{ itemIndex: i },
								);
							}

							const buffer = await this.helpers.getBinaryDataBuffer(i, propertyNameUpload);
							await sftp!.put(buffer, remotePath);
						} else {
							// Is text file
							const buffer = Buffer.from(
								this.getNodeParameter('fileContent', i) as string,
								'utf8',
							) as Buffer;
							await sftp!.put(buffer, remotePath);
						}

						returnItems.push(items[i]);
					}
				}

				if (protocol === 'ftp') {
					if (operation === 'list') {
						const path = this.getNodeParameter('path', i) as string;

						const recursive = this.getNodeParameter('recursive', i) as boolean;

						if (recursive) {
							responseData = await callRecursiveList(path, ftp!, normalizeFtpItem);
							returnItems.push.apply(
								returnItems,
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
							);
						} else {
							responseData = await ftp!.list(path);
							responseData.forEach((item) =>
								normalizeFtpItem(item as ftpClient.ListingElement, path),
							);
							returnItems.push.apply(
								returnItems,
								this.helpers.returnJsonArray(responseData as unknown as IDataObject[]),
							);
						}
					}

					if (operation === 'delete') {
						const path = this.getNodeParameter('path', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						if (options.folder === true) {
							responseData = await ftp!.rmdir(path, !!options.recursive);
						} else {
							responseData = await ftp!.delete(path);
						}

						returnItems.push({ json: { success: true } });
					}

					if (operation === 'download') {
						const path = this.getNodeParameter('path', i) as string;

						responseData = await ftp!.get(path);

						// Convert readable stream to buffer so that can be displayed properly
						const chunks = [];
						for await (const chunk of responseData) {
							chunks.push(chunk);
						}

						// @ts-ignore
						responseData = Buffer.concat(chunks);

						const dataPropertyNameDownload = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;

						const filePathDownload = this.getNodeParameter('path', i) as string;
						items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
							responseData,
							filePathDownload,
						);

						returnItems.push(items[i]);
					}

					if (operation === 'rename') {
						const oldPath = this.getNodeParameter('oldPath', i) as string;

						const newPath = this.getNodeParameter('newPath', i) as string;

						responseData = await ftp!.rename(oldPath, newPath);

						returnItems.push({ json: { success: true } });
					}

					if (operation === 'upload') {
						const remotePath = this.getNodeParameter('path', i) as string;
						const fileName = basename(remotePath);
						const dirPath = remotePath.replace(fileName, '');

						if (this.getNodeParameter('binaryData', i) === true) {
							// Is binary file to upload
							const item = items[i];

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

							if (item.binary[propertyNameUpload] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${propertyNameUpload}" does not exists on item!`,
									{ itemIndex: i },
								);
							}

							const buffer = await this.helpers.getBinaryDataBuffer(i, propertyNameUpload);

							try {
								await ftp!.put(buffer, remotePath);
							} catch (error) {
								if (error.code === 553) {
									// Create directory
									await ftp!.mkdir(dirPath, true);
									await ftp!.put(buffer, remotePath);
								} else {
									throw new NodeApiError(this.getNode(), error);
								}
							}
						} else {
							// Is text file
							const buffer = Buffer.from(
								this.getNodeParameter('fileContent', i) as string,
								'utf8',
							) as Buffer;
							try {
								await ftp!.put(buffer, remotePath);
							} catch (error) {
								if (error.code === 553) {
									// Create directory
									await ftp!.mkdir(dirPath, true);
									await ftp!.put(buffer, remotePath);
								} else {
									throw new NodeApiError(this.getNode(), error);
								}
							}
						}
						returnItems.push(items[i]);
					}
				}
			}

			if (protocol === 'sftp') {
				await sftp!.end();
			} else {
				await ftp!.end();
			}
		} catch (error) {
			if (this.continueOnFail()) {
				return this.prepareOutputData([{ json: { error: error.message } }]);
			}

			throw error;
		}
		return [returnItems];
	}
}

function normalizeFtpItem(input: ftpClient.ListingElement, path: string, recursive = false) {
	const item = input as unknown as ReturnFtpItem;
	item.modifyTime = input.date;
	item.path = !recursive ? `${path}${path.endsWith('/') ? '' : '/'}${item.name}` : path;
	//@ts-ignore
	item.date = undefined;
}

function normalizeSFtpItem(input: sftpClient.FileInfo, path: string, recursive = false) {
	const item = input as unknown as ReturnFtpItem;
	item.accessTime = new Date(input.accessTime);
	item.modifyTime = new Date(input.modifyTime);
	item.path = !recursive ? `${path}${path.endsWith('/') ? '' : '/'}${item.name}` : path;
}

async function callRecursiveList(
	path: string,
	client: sftpClient | ftpClient,
	normalizeFunction: (
		input: ftpClient.ListingElement & sftpClient.FileInfo,
		path: string,
		recursive?: boolean,
	) => void,
) {
	const pathArray: string[] = [path];
	let currentPath = path;
	const directoryItems: sftpClient.FileInfo[] = [];
	let index = 0;

	do {
		// tslint:disable-next-line: array-type
		const returnData: sftpClient.FileInfo[] | (string | ftpClient.ListingElement)[] =
			await client.list(pathArray[index]);

		// @ts-ignore
		returnData.map((item: sftpClient.FileInfo) => {
			if ((pathArray[index] as string).endsWith('/')) {
				currentPath = `${pathArray[index]}${item.name}`;
			} else {
				currentPath = `${pathArray[index]}/${item.name}`;
			}

			// Is directory
			if (item.type === 'd') {
				pathArray.push(currentPath);
			}

			normalizeFunction(item as ftpClient.ListingElement & sftpClient.FileInfo, currentPath, true);
			directoryItems.push(item);
		});
		index++;
	} while (index <= pathArray.length - 1);

	return directoryItems;
}

async function recursivelyCreateSftpDirs(sftp: sftpClient, path: string) {
	const dirPath = dirname(path);
	const dirExists = await sftp!.exists(dirPath);

	if (!dirExists) {
		await sftp!.mkdir(dirPath, true);
	}
}
