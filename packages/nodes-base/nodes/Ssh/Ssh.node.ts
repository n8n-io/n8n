import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import {
	NodeSSH,
	Config,
} from 'node-ssh';

import * as fs from 'fs';

import * as tmp from 'tmp';

const ssh = new NodeSSH();

export class Ssh implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSH',
		name: 'Ssh',
		icon: 'fa:terminal',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
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
				default: '',
				description: 'The command to be executed on a remote device.',
			},
			{
				displayName: 'Working Directory',
				name: 'cwd',
				type: 'string',
				default: '/',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: IDataObject[] = [];

		let responseData;

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
			} as Config;

			if (!credentials.passphrase) {
				options.passphrase = credentials.passphrase as string;
			}

			await ssh.connect(options);

			//@ts-ignore
			await tmpFile.removeCallback();
		}

		for (let i = 0; i < items.length; i++) {

			if (operation === 'execute') {

				const command = this.getNodeParameter('command', i) as string;

				const cwd = this.getNodeParameter('cwd', i) as string;

				responseData = await ssh.execCommand(command, { cwd, });

			}

			if (Array.isArray(responseData)) {

				returnData.push.apply(returnData, responseData as IDataObject[]);

			} else if (responseData !== undefined) {
				//@ts-ignore
				returnData.push(responseData as IDataObject);
			}
		}

		ssh.dispose();

		return [this.helpers.returnJsonArray(returnData)];
	}
}
