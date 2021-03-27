import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	addConfigFields,
	addFields,
	cloneFields,
	commitFields,
	logFields,
	tagFields,
} from './descriptions';

import simpleGit, {
	LogOptions,
	SimpleGit,
	SimpleGitOptions,
} from 'simple-git';

export class Git implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Git',
		name: 'git',
		icon: 'file:git.svg',
		group: ['transform'],
		version: 1,
		description: 'Control git.',
		defaults: {
			name: 'Git',
			color: '#808080',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'log',
				description: 'Operation to perform',
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a file or folder to commit.',
					},
					{
						name: 'Add Config',
						value: 'addConfig',
						description: 'Add configuration property.',
					},
					{
						name: 'Commit',
						value: 'commit',
						description: 'Commit files or folders to git.',
					},
					{
						name: 'Clone',
						value: 'clone',
						description: 'Clone a repository.',
					},
					{
						name: 'Fetch',
						value: 'fetch',
						description: 'Fetch from remote repository.',
					},
					{
						name: 'List Config',
						value: 'listConfig',
						description: 'Return current configuration.',
					},
					{
						name: 'Log',
						value: 'log',
						description: 'Return git commit history.',
					},
					{
						name: 'Status',
						value: 'status',
						description: 'Return status of current repository.',
					},
					{
						name: 'User Setup',
						value: 'userSetup',
						description: 'Set the user.',
					},
					{
						name: 'Tag',
						value: 'tag',
						description: 'Create a new tag.',
					},
					{
						name: 'Pull',
						value: 'pull',
						description: 'Pull from remote repository.',
					},
					{
						name: 'Push',
						value: 'push',
						description: 'Push to remote repository.',
					},
					{
						name: 'Push Tags',
						value: 'pushTags',
						description: 'Push Tags to remote repository.',
					},
				],
			},

			{
				displayName: 'Base Directory',
				name: 'baseDirectory',
				type: 'string',
				default: '',
				placeholder: '/data/repository',
				required: true,
				description: 'Path to the git repository to operate on.',
			},

			...addFields,
			...addConfigFields,
			...cloneFields,
			...commitFields,
			...logFields,
			...tagFields,
			// ...userSetupFields,
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0) as string;

		let item: INodeExecutionData;
		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = items[itemIndex];

			const baseDir = this.getNodeParameter('baseDirectory', itemIndex, '') as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const gitOptions: Partial<SimpleGitOptions> = {
				baseDir,
				binary: 'git',
				maxConcurrentProcesses: 6,
			};

			// TODO: Allow to set credentials
			const git: SimpleGit = simpleGit(gitOptions);

			// TODO: Allow to set users
			// git = git.addConfig('user.name', 'Some One')
			// 	.addConfig('user.email', 'some@one.com');

			// TODO: Add continue on error
			// TODO: Make it possible to auto-confirm RSA key fingerprint

			if (operation === 'add') {
				// ----------------------------------
				//         add
				// ----------------------------------

				const paths = this.getNodeParameter('paths', itemIndex, '') as string;

				await git.add(paths.split(','));

				returnItems.push({ json: { success: true } });

			} else if (operation === 'addConfig') {
				// ----------------------------------
				//         addConfig
				// ----------------------------------

				const key = this.getNodeParameter('key', itemIndex, '') as string;
				const value = this.getNodeParameter('value', itemIndex, '') as string;
				const append = this.getNodeParameter('append', itemIndex, '') as boolean;

				await git.addConfig(key, value, append);
				returnItems.push({ json: { success: true } });

			} else if (operation === 'clone') {
				// ----------------------------------
				//         clone
				// ----------------------------------

				const repositoryPath = this.getNodeParameter('repositoryPath', itemIndex, '') as string;

				const a = await git.clone(repositoryPath, '.');
				console.log('a');
				console.log(a);

				returnItems.push({ json: { success: true } });

			} else if (operation === 'commit') {
				// ----------------------------------
				//         commit
				// ----------------------------------

				const message = this.getNodeParameter('message', itemIndex, '') as string;

				let files: string[] | undefined = undefined;
				if (options.files !== undefined) {
					files = (options.files as string).split(',');
				}

				await git.commit(message, files);

				returnItems.push({ json: { success: true } });

			} else if (operation === 'fetch') {
				// ----------------------------------
				//         fetch
				// ----------------------------------

				await git.fetch();
				returnItems.push({ json: { success: true } });

			} else if (operation === 'log') {
				// ----------------------------------
				//         log
				// ----------------------------------

				const logOptions: LogOptions = {};

				const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
				if (returnAll === false) {
					logOptions.maxCount = this.getNodeParameter('limit', itemIndex, 100) as number;
				}
				if (options.file) {
					logOptions.file = options.file as string;
				}

				const log = await git.log(logOptions);

				// @ts-ignore
				returnItems.push(...this.helpers.returnJsonArray(log.all));

			} else if (operation === 'pull') {
				// ----------------------------------
				//         pull
				// ----------------------------------

				await git.pull();
				returnItems.push({ json: { success: true } });

			} else if (operation === 'push') {
				// ----------------------------------
				//         push
				// ----------------------------------

				await git.push();
				returnItems.push({ json: { success: true } });

			} else if (operation === 'pushTags') {
				// ----------------------------------
				//         pushTags
				// ----------------------------------

				await git.pushTags();
				returnItems.push({ json: { success: true } });

			} else if (operation === 'listConfig') {
				// ----------------------------------
				//         listConfig
				// ----------------------------------

				const config = await git.listConfig();

				const data = [];
				for (const fileName of Object.keys(config.values)) {
					data.push({
						_file: fileName,
						...config.values[fileName],
					});
				}

				// @ts-ignore
				returnItems.push(...this.helpers.returnJsonArray(data));

			} else if (operation === 'status') {
				// ----------------------------------
				//         status
				// ----------------------------------

				const status = await git.status();

				// @ts-ignore
				returnItems.push(...this.helpers.returnJsonArray([status]));

			} else if (operation === 'tag') {
				// ----------------------------------
				//         tag
				// ----------------------------------

				const name = this.getNodeParameter('name', itemIndex, '') as string;

				await git.addTag(name);
				returnItems.push({ json: { success: true } });

			} else {
				throw new Error(`The operation "${operation}" is not known!`);
			}
		}

		return this.prepareOutputData(returnItems);
	}
}
