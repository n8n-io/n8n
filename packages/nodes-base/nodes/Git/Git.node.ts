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
	pushFields,
	tagFields,
} from './descriptions';

import simpleGit, {
	LogOptions,
	SimpleGit,
	SimpleGitOptions,
} from 'simple-git';

import {
	access,
	mkdir,
} from 'fs/promises';

import { URL } from 'url';

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
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gitPassword',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'gitPassword',
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
						name: 'Authenticate',
						value: 'gitPassword',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'clone',
							'push',
						],
					},
				},
				default: 'none',
				description: 'The way to authenticate.',
			},
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
						description: 'Add a file or folder to commit',
					},
					{
						name: 'Add Config',
						value: 'addConfig',
						description: 'Add configuration property',
					},
					{
						name: 'Clone',
						value: 'clone',
						description: 'Clone a repository',
					},
					{
						name: 'Commit',
						value: 'commit',
						description: 'Commit files or folders to git',
					},
					{
						name: 'Fetch',
						value: 'fetch',
						description: 'Fetch from remote repository',
					},
					{
						name: 'List Config',
						value: 'listConfig',
						description: 'Return current configuration',
					},
					{
						name: 'Log',
						value: 'log',
						description: 'Return git commit history',
					},
					{
						name: 'Pull',
						value: 'pull',
						description: 'Pull from remote repository',
					},
					{
						name: 'Push',
						value: 'push',
						description: 'Push to remote repository',
					},
					{
						name: 'Push Tags',
						value: 'pushTags',
						description: 'Push Tags to remote repository',
					},
					{
						name: 'Status',
						value: 'status',
						description: 'Return status of current repository',
					},
					{
						name: 'Tag',
						value: 'tag',
						description: 'Create a new tag',
					},
					{
						name: 'User Setup',
						value: 'userSetup',
						description: 'Set the user',
					},
				],
			},

			{
				displayName: 'Repository Path',
				name: 'repositoryPath',
				type: 'string',
				displayOptions: {
					hide: {
						operation: [
							'clone',
						],
					},
				},
				default: '',
				placeholder: '/tmp/repository',
				required: true,
				description: 'Local path of the git repository to operate on.',
			},
			{
				displayName: 'New Repository Path',
				name: 'repositoryPath',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'clone',
						],
					},
				},
				default: '',
				placeholder: '/tmp/repository',
				required: true,
				description: 'Local path to which the git repository should be cloned into.',
			},

			...addFields,
			...addConfigFields,
			...cloneFields,
			...commitFields,
			...logFields,
			...pushFields,
			...tagFields,
			// ...userSetupFields,
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();


		const prepareRepository = async (repositoryPath: string): Promise<string> => {
			const authentication = this.getNodeParameter('authentication', 0) as string;

			if (authentication === 'gitPassword') {
				const gitCredentials = await this.getCredentials('gitPassword') as IDataObject;

				const url = new URL(repositoryPath);
				url.username = gitCredentials.username as string;
				url.password = gitCredentials.password as string;

				return url.toString();
			}

			return repositoryPath;
		};

		const operation = this.getNodeParameter('operation', 0) as string;
		let item: INodeExecutionData;
		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				item = items[itemIndex];

				const repositoryPath = this.getNodeParameter('repositoryPath', itemIndex, '') as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

				if (operation === 'clone') {
					// Create repository folder if it does not exist
					try {
						await access(repositoryPath);
					} catch (error) {
						await mkdir(repositoryPath);
					}
				}

				const gitOptions: Partial<SimpleGitOptions> = {
					baseDir: repositoryPath,
				};

				const git: SimpleGit = simpleGit(gitOptions)
					// Tell git not to ask for any information via the terminal like for
					// example the username. As nobody will be able to answer it would
					// n8n keep on waiting forever.
					.env('GIT_TERMINAL_PROMPT', '0');

				if (operation === 'add') {
					// ----------------------------------
					//         add
					// ----------------------------------

					const pathsToAdd = this.getNodeParameter('pathsToAdd', itemIndex, '') as string;

					await git.add(pathsToAdd.split(','));

					returnItems.push({ json: { success: true } });

				} else if (operation === 'addConfig') {
					// ----------------------------------
					//         addConfig
					// ----------------------------------

					const key = this.getNodeParameter('key', itemIndex, '') as string;
					const value = this.getNodeParameter('value', itemIndex, '') as string;
					let append = false;

					if (options.mode === 'append') {
						append = true;
					}

					await git.addConfig(key, value, append);
					returnItems.push({ json: { success: true } });

				} else if (operation === 'clone') {
					// ----------------------------------
					//         clone
					// ----------------------------------

					let sourceRepository = this.getNodeParameter('sourceRepository', itemIndex, '') as string;
					sourceRepository = await prepareRepository(sourceRepository);

					await git.clone(sourceRepository, '.');

					returnItems.push({ json: { success: true } });

				} else if (operation === 'commit') {
					// ----------------------------------
					//         commit
					// ----------------------------------

					const message = this.getNodeParameter('message', itemIndex, '') as string;

					let pathsToAdd: string[] | undefined = undefined;
					if (options.files !== undefined) {
						pathsToAdd = (options.pathsToAdd as string).split(',');
					}

					await git.commit(message, pathsToAdd);

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

					if (options.repository) {
						const targetRepository = await prepareRepository(options.targetRepository as string);
						await git.push(targetRepository);
					} else {
						const authentication = this.getNodeParameter('authentication', 0) as string;
						if (authentication === 'gitPassword') {
							// Try to get remote repository path from git repository itself to add
							// authentication data
							const config = await git.listConfig();
							let targetRepository;
							for (const fileName of Object.keys(config.values)) {
								if (config.values[fileName]['remote.origin.url']) {
									targetRepository = config.values[fileName]['remote.origin.url'];
									break;
								}
							}

							targetRepository = await prepareRepository(targetRepository as string);
							await git.push(targetRepository);
						} else {
							await git.push();
						}
					}

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

				}

			} catch (error) {

				if (this.continueOnFail()) {
					returnItems.push({ json: { error: error.toString() } });
					continue;
				}

				throw error;
			}
		}

		return this.prepareOutputData(returnItems);
	}
}
