import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const nodeSSH = require('node-ssh');

import * as fs from 'fs';

import * as tmp from 'tmp';

const ssh = new nodeSSH.NodeSSH();

export class Ssh implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSH',
		name: 'Ssh',
		icon: 'fa:terminal',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: '',
		defaults: {
			name: 'SSH',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sshPassword',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'password',
						],
					},
				},
			},
			{
				name: 'sshPrivateKey',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'privateKey',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Password',
						value: 'password',
					},
					{
						name: 'Private Key',
						value: 'privateKey',
					},
				],
				default: 'password',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Command',
						value: 'command',
					},
					{
						name: 'File',
						value: 'file',
					},
				],
				default: 'command',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'command',
						],
					},
				},
				options: [
					{
						name: 'Execute',
						value: 'execute',
						description: 'Execute a command',
					},
				],
				default: 'execute',
				description: 'Operation to perform.',
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'command',
						],
						operation: [
							'execute',
						],
					},
				},
				default: '',
				description: 'The command to be executed on a remote device.',
			},
			{
				displayName: 'Working Directory',
				name: 'cwd',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'command',
						],
						operation: [
							'execute',
						],
					},
				},
				default: '/',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
					},
				},
				options: [
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
					},
					{
						name: 'upload',
						value: 'upload',
						description: 'Upload a file',
					},
				],
				default: 'upload',
				description: 'Operation to perform.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'upload',
						],
						resource: [
							'file',
						],
					},
				},
				placeholder: '',
				description: 'Name of the binary property which contains<br />the data for the file to be uploaded.',
			},
			{
				displayName: 'Remote Path',
				name: 'remotePath',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
						operation: [
							'upload',
						],
					},
				},
				default: '/',
				description: 'Remote Path',
			},
			{
				displayName: 'Path',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
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
						resource: [
							'file',
						],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;

		const operation = this.getNodeParameter('operation', 0) as string;

		const authentication = this.getNodeParameter('authentication', 0) as string;

		if (authentication === 'password') {

			const credentials = this.getCredentials('sshPassword') as IDataObject;

			await ssh.connect({
				host: credentials.host as string,
				username: credentials.username as string,
				port: credentials.port as number,
				password: credentials.password as string,
			});

		} else if (authentication === 'privateKey') {

			const credentials = this.getCredentials('sshPrivateKey') as IDataObject;

			const tmpFile = tmp.fileSync({});

			fs.writeFileSync(tmpFile.name as string, credentials.privateKey as string);

			const options = {
				host: credentials.host as string,
				username: credentials.username as string,
				port: credentials.port as number,
				privateKey: tmpFile.name,
			} as any;

			if (!credentials.passphrase) {
				options.passphrase = credentials.passphrase as string;
			}

			await ssh.connect(options);

			await tmpFile.removeCallback();
		}

		for (let i = 0; i < items.length; i++) {

			if (resource === 'command') {

				if (operation === 'execute') {

					const command = this.getNodeParameter('command', i) as string;

					const cwd = this.getNodeParameter('cwd', i) as string;

					returnData.push(await ssh.execCommand(command, { cwd, }));

				}
			}

			if (resource === 'file') {

				if (operation === 'download') {

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

					const path = this.getNodeParameter('path', i) as string;

					const tmpFile = tmp.fileSync({});

					await ssh.getFile(tmpFile.name, path);

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

					const data = fs.readFileSync(tmpFile.name as string);

					await tmpFile.removeCallback();

					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data as unknown as Buffer, path.split('/').pop());
				}

				if (operation === 'upload') {

					const remotePath = this.getNodeParameter('remotePath', i) as string;

					const item = items[i];

					if (item.binary === undefined) {
						throw new Error('No binary data exists on item!');
					}

					const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

					const binaryData = item.binary[propertyNameUpload] as IBinaryData;

					if (item.binary[propertyNameUpload] === undefined) {
						throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
					}

					const data = Buffer.from(binaryData.data, BINARY_ENCODING);

					const tmpFile = tmp.fileSync({});

					fs.writeFileSync(tmpFile.name as string, data);

					await ssh.putFile(tmpFile.name, `${remotePath}${(remotePath === '/') ? '' : '/'}${binaryData.fileName}`);

					await tmpFile.removeCallback();

					returnData.push({ success: true });
				}
			}
		}

		ssh.dispose();

		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			return [this.helpers.returnJsonArray(returnData)];
		}
	}
}
