import {
	BINARY_ENCODING,
	IExecuteFunctions
} from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';
import {
	basename,
	dirname,
} from 'path';

import * as ftpClient from 'promise-ftp';
import * as sftpClient from 'ssh2-sftp-client';

export class Ftp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FTP',
		name: 'ftp',
		icon: 'fa:server',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["protocol"] + ": " + $parameter["operation"]}}',
		description: 'Transfers files via FTP or SFTP.',
		defaults: {
			name: 'FTP',
			color: '#303050',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ftp',
				required: true,
				displayOptions: {
					show: {
						protocol: [
							'ftp',
						],
					},
				},
			},
			{
				name: 'sftp',
				required: true,
				displayOptions: {
					show: {
						protocol: [
							'sftp',
						],
					},
				},
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
				description: 'File transfer protocol.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file.',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List folder content.',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file.',
					},
				],
				default: 'download',
				description: 'Operation to perform.',
			},

			// ----------------------------------
			//         download
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: [
							'download',
						],
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
						operation: [
							'download',
						],
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data.',
				required: true,
			},

			// ----------------------------------
			//         upload
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
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
						operation: [
							'upload',
						],
					},
				},
				name: 'binaryData',
				type: 'boolean',
				default: true,
				description: 'The text content of the file to upload.',
			},
			{
				displayName: 'Binary Property',
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						binaryData: [
							true,
						]
					},
				},
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Object property name which holds binary data.',
				required: true,
			},
			{
				displayName: 'File Content',
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						binaryData: [
							false,
						]
					},
				},
				name: 'fileContent',
				type: 'string',
				default: '',
				description: 'The text content of the file to upload.',
			},

			// ----------------------------------
			//         list
			// ----------------------------------
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
					},
				},
				name: 'path',
				type: 'string',
				default: '/',
				description: 'Path of directory to list contents of.',
				required: true,
			},
		],
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
			credentials = this.getCredentials('sftp');
		} else {
			credentials = this.getCredentials('ftp');
		}

		if (credentials === undefined) {
			throw new Error('Failed to get credentials!');
		}

		let ftp: ftpClient;
		let sftp: sftpClient;
		if (protocol === 'sftp') {
			sftp = new sftpClient();

			await sftp.connect({
				host: credentials.host as string,
				port: credentials.port as number,
				username: credentials.username as string,
				password: credentials.password as string,
			});

		} else {
			ftp = new ftpClient();

			await ftp.connect({
				host: credentials.host as string,
				port: credentials.port as number,
				user: credentials.username as string,
				password: credentials.password as string
			});
		}

		for (let i = 0; i < items.length; i++) {
			const newItem: INodeExecutionData = {
				json: items[i].json,
				binary: {},
			};

			if (items[i].binary !== undefined) {
				// Create a shallow copy of the binary data so that the old
				// data references which do not get changed still stay behind
				// but the incoming data does not get changed.
				Object.assign(newItem.binary, items[i].binary);
			}

			items[i] = newItem;

			if (protocol === 'sftp') {
				const path = this.getNodeParameter('path', i) as string;

				if (operation === 'list') {
					responseData = await sftp!.list(path);
					returnItems.push.apply(returnItems, this.helpers.returnJsonArray(responseData as unknown as IDataObject[]));
				}

				if (operation === 'download') {
					responseData = await sftp!.get(path);

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

					const filePathDownload = this.getNodeParameter('path', i) as string;
					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(responseData as Buffer, filePathDownload);

					returnItems.push(items[i]);
				}

				if (operation === 'upload') {
					const remotePath = this.getNodeParameter('path', i) as string;

					// Check if dir path exists
					const dirExists = await sftp!.exists(dirname(remotePath));

					// If dir does not exist, create all recursively in path
					if (!dirExists) {
						// Separate filename from dir path
						const fileName = basename(remotePath);
						const dirPath = remotePath.replace(fileName, '');
						// Create directory
						await sftp!.mkdir(dirPath, true);
					}

					if (this.getNodeParameter('binaryData', i) === true) {
						// Is binary file to upload
						const item = items[i];

						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

						if (item.binary[propertyNameUpload] === undefined) {
							throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
						}

						const buffer = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING) as Buffer;
						await sftp!.put(buffer, remotePath);
					} else {
						// Is text file
						const buffer = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8') as Buffer;
						await sftp!.put(buffer, remotePath);
					}

					returnItems.push(items[i]);
				}
			}

			if (protocol === 'ftp') {

				const path = this.getNodeParameter('path', i) as string;

				if (operation === 'list') {
					responseData = await ftp!.list(path);
					returnItems.push.apply(returnItems, this.helpers.returnJsonArray(responseData as unknown as IDataObject[]));
				}

				if (operation === 'download') {
					responseData = await ftp!.get(path);

					// Convert readable stream to buffer so that can be displayed properly
					const chunks = [];
					for await (const chunk of responseData) {
						chunks.push(chunk);
					}

					// @ts-ignore
					responseData = Buffer.concat(chunks);

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

					const filePathDownload = this.getNodeParameter('path', i) as string;
					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(responseData, filePathDownload);

					returnItems.push(items[i]);
				}

				if (operation === 'upload') {
					const remotePath = this.getNodeParameter('path', i) as string;
					const fileName = basename(remotePath);
					const dirPath = remotePath.replace(fileName, '');

					if (this.getNodeParameter('binaryData', i) === true) {
						// Is binary file to upload
						const item = items[i];

						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}

						const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

						if (item.binary[propertyNameUpload] === undefined) {
							throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
						}

						const buffer = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING) as Buffer;

						try {
							await ftp!.put(buffer, remotePath);
						} catch (error) {
							if (error.code === 553) {
								// Create directory
								await ftp!.mkdir(dirPath, true);
								await ftp!.put(buffer, remotePath);
							} else {
								throw new Error(error);
							}
						}
					} else {
						// Is text file
						const buffer = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8') as Buffer;
						try {
							await ftp!.put(buffer, remotePath);
						} catch (error) {
							if (error.code === 553) {
								// Create directory
								await ftp!.mkdir(dirPath, true);
								await ftp!.put(buffer, remotePath);
							} else {
								throw new Error(error);
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

		return [returnItems];
	}
}
