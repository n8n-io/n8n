import { access, mkdir } from 'fs/promises';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, assertParamIsBoolean, assertParamIsString } from 'n8n-workflow';
import type { LogOptions, SimpleGit, SimpleGitOptions } from 'simple-git';
import simpleGit from 'simple-git';
import { URL } from 'url';

import {
	addConfigFields,
	addFields,
	cloneFields,
	commitFields,
	logFields,
	pushFields,
	switchBranchFields,
	tagFields,
} from './descriptions';
import { Container } from '@n8n/di';
import { DeploymentConfig, SecurityConfig } from '@n8n/config';

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
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gitPassword',
				required: true,
				displayOptions: {
					show: {
						authentication: ['gitPassword'],
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
						operation: ['clone', 'push'],
					},
				},
				default: 'none',
				description: 'The way to authenticate',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'log',
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a file or folder to commit',
						action: 'Add a file or folder to commit',
					},
					{
						name: 'Add Config',
						value: 'addConfig',
						description: 'Add configuration property',
						action: 'Add configuration property',
					},
					{
						name: 'Clone',
						value: 'clone',
						description: 'Clone a repository',
						action: 'Clone a repository',
					},
					{
						name: 'Commit',
						value: 'commit',
						description: 'Commit files or folders to git',
						action: 'Commit files or folders to git',
					},
					{
						name: 'Fetch',
						value: 'fetch',
						description: 'Fetch from remote repository',
						action: 'Fetch from remote repository',
					},
					{
						name: 'List Config',
						value: 'listConfig',
						description: 'Return current configuration',
						action: 'Return current configuration',
					},
					{
						name: 'Log',
						value: 'log',
						description: 'Return git commit history',
						action: 'Return git commit history',
					},
					{
						name: 'Pull',
						value: 'pull',
						description: 'Pull from remote repository',
						action: 'Pull from remote repository',
					},
					{
						name: 'Push',
						value: 'push',
						description: 'Push to remote repository',
						action: 'Push to remote repository',
					},
					{
						name: 'Push Tags',
						value: 'pushTags',
						description: 'Push Tags to remote repository',
						action: 'Push tags to remote repository',
					},
					{
						name: 'Status',
						value: 'status',
						description: 'Return status of current repository',
						action: 'Return status of current repository',
					},
					{
						name: 'Switch Branch',
						value: 'switchBranch',
						description: 'Switch to a different branch',
						action: 'Switch to a different branch',
					},
					{
						name: 'Tag',
						value: 'tag',
						description: 'Create a new tag',
						action: 'Create a new tag',
					},
					{
						name: 'User Setup',
						value: 'userSetup',
						description: 'Set the user',
						action: 'Set up a user',
					},
				],
			},

			{
				displayName: 'Repository Path',
				name: 'repositoryPath',
				type: 'string',
				displayOptions: {
					hide: {
						operation: ['clone'],
					},
				},
				default: '',
				placeholder: '/tmp/repository',
				required: true,
				description: 'Local path of the git repository to operate on',
			},
			{
				displayName: 'New Repository Path',
				name: 'repositoryPath',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['clone'],
					},
				},
				default: '',
				placeholder: '/tmp/repository',
				required: true,
				description: 'Local path to which the git repository should be cloned into',
			},

			...addFields,
			...addConfigFields,
			...cloneFields,
			...commitFields,
			...logFields,
			...pushFields,
			...switchBranchFields,
			...tagFields,
			// ...userSetupFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const prepareRepository = async (repositoryPath: string): Promise<string> => {
			const authentication = this.getNodeParameter('authentication', 0) as string;

			if (authentication === 'gitPassword') {
				const gitCredentials = await this.getCredentials('gitPassword');

				const url = new URL(repositoryPath);
				url.username = gitCredentials.username as string;
				url.password = gitCredentials.password as string;

				return url.toString();
			}

			return repositoryPath;
		};

		interface CheckoutBranchOptions {
			branchName: string;
			createBranch?: boolean;
			startPoint?: string;
			force?: boolean;
			setUpstream?: boolean;
			remoteName?: string;
		}

		const checkoutBranch = async (
			git: SimpleGit,
			options: CheckoutBranchOptions,
		): Promise<void> => {
			const {
				branchName,
				createBranch = true,
				startPoint,
				force = false,
				setUpstream = false,
				remoteName = 'origin',
			} = options;
			try {
				if (force) {
					await git.checkout(['-f', branchName]);
				} else {
					await git.checkout(branchName);
				}
			} catch (error) {
				if (createBranch) {
					// Try to create the branch when checkout fails
					if (startPoint) {
						await git.checkoutBranch(branchName, startPoint);
					} else {
						await git.checkoutLocalBranch(branchName);
					}
					// If we reach here, branch creation succeeded
				} else {
					// Don't create branch, throw original error
					throw error;
				}
			}

			if (setUpstream) {
				try {
					await git.addConfig(`branch.${branchName}.remote`, remoteName);
					await git.addConfig(`branch.${branchName}.merge`, `refs/heads/${branchName}`);
				} catch (upstreamError) {
					// Upstream setup failed but that's non-fatal
				}
			}
		};

		const operation = this.getNodeParameter('operation', 0);
		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const repositoryPath = this.getNodeParameter('repositoryPath', itemIndex, '') as string;
				const options = this.getNodeParameter('options', itemIndex, {});

				if (operation === 'clone') {
					// Create repository folder if it does not exist
					try {
						await access(repositoryPath);
					} catch (error) {
						await mkdir(repositoryPath);
					}
				}

				const gitConfig: string[] = [];
				const deploymentConfig = Container.get(DeploymentConfig);
				const isCloud = deploymentConfig.type === 'cloud';
				const securityConfig = Container.get(SecurityConfig);
				const disableBareRepos = securityConfig.disableBareRepos;
				if (isCloud || disableBareRepos) {
					gitConfig.push('safe.bareRepository=explicit');
				}

				const gitOptions: Partial<SimpleGitOptions> = {
					baseDir: repositoryPath,
					config: gitConfig,
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

					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
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
					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else if (operation === 'clone') {
					// ----------------------------------
					//         clone
					// ----------------------------------

					let sourceRepository = this.getNodeParameter('sourceRepository', itemIndex, '') as string;
					sourceRepository = await prepareRepository(sourceRepository);

					await git.clone(sourceRepository, '.');

					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else if (operation === 'commit') {
					// ----------------------------------
					//         commit
					// ----------------------------------

					const message = this.getNodeParameter('message', itemIndex, '') as string;
					const branch = options.branch;
					if (branch !== undefined && branch !== '') {
						assertParamIsString('branch', branch, this.getNode());
						await checkoutBranch(git, {
							branchName: branch,
							setUpstream: true,
						});
					}

					let pathsToAdd: string[] | undefined = undefined;
					if (options.files !== undefined) {
						pathsToAdd = (options.pathsToAdd as string).split(',');
					}

					await git.commit(message, pathsToAdd);

					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else if (operation === 'fetch') {
					// ----------------------------------
					//         fetch
					// ----------------------------------

					await git.fetch();
					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else if (operation === 'log') {
					// ----------------------------------
					//         log
					// ----------------------------------

					const logOptions: LogOptions = {};

					const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
					if (!returnAll) {
						logOptions.maxCount = this.getNodeParameter('limit', itemIndex, 100);
					}
					if (options.file) {
						logOptions.file = options.file as string;
					}

					const log = await git.log(logOptions);

					returnItems.push(
						// @ts-ignore
						...this.helpers.returnJsonArray(log.all).map((item) => {
							return {
								...item,
								pairedItem: { item: itemIndex },
							};
						}),
					);
				} else if (operation === 'pull') {
					// ----------------------------------
					//         pull
					// ----------------------------------

					await git.pull();
					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else if (operation === 'push') {
					// ----------------------------------
					//         push
					// ----------------------------------

					const branch = options.branch;
					if (branch !== undefined && branch !== '') {
						assertParamIsString('branch', branch, this.getNode());
						await checkoutBranch(git, {
							branchName: branch,
							createBranch: false,
							setUpstream: true,
						});
					}

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

					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else if (operation === 'pushTags') {
					// ----------------------------------
					//         pushTags
					// ----------------------------------

					await git.pushTags();
					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
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

					returnItems.push(
						...this.helpers.returnJsonArray(data).map((item) => {
							return {
								...item,
								pairedItem: { item: itemIndex },
							};
						}),
					);
				} else if (operation === 'status') {
					// ----------------------------------
					//         status
					// ----------------------------------

					const status = await git.status();

					returnItems.push(
						// @ts-ignore
						...this.helpers.returnJsonArray([status]).map((item) => {
							return {
								...item,
								pairedItem: { item: itemIndex },
							};
						}),
					);
				} else if (operation === 'switchBranch') {
					// ----------------------------------
					//         switchBranch
					// ----------------------------------

					const branchName = this.getNodeParameter('branchName', itemIndex);
					assertParamIsString('branchName', branchName, this.getNode());

					const createBranch = options.createBranch;
					if (createBranch !== undefined) {
						assertParamIsBoolean('createBranch', createBranch, this.getNode());
					}
					const remoteName =
						typeof options.remoteName === 'string' && options.remoteName
							? options.remoteName
							: 'origin';

					const startPoint = options.startPoint;
					if (startPoint !== undefined) {
						assertParamIsString('startPoint', startPoint, this.getNode());
					}

					const setUpstream = options.setUpstream;
					if (setUpstream !== undefined) {
						assertParamIsBoolean('setUpstream', setUpstream, this.getNode());
					}

					const force = options.force;
					if (force !== undefined) {
						assertParamIsBoolean('force', force, this.getNode());
					}

					await checkoutBranch(git, {
						branchName,
						createBranch,
						startPoint,
						force,
						setUpstream,
						remoteName,
					});

					returnItems.push({
						json: {
							success: true,
							branch: branchName,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else if (operation === 'tag') {
					// ----------------------------------
					//         tag
					// ----------------------------------

					const name = this.getNodeParameter('name', itemIndex, '') as string;

					await git.addTag(name);
					returnItems.push({
						json: {
							success: true,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({
						json: {
							error: error.toString(),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw error;
			}
		}

		return [returnItems];
	}
}
