import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ResolvedFilePath,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	NodeOperationError,
	assertParamIsBoolean,
	assertParamIsString,
} from 'n8n-workflow';
import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'path';
import type { LogOptions, SimpleGit, SimpleGitOptions } from 'simple-git';
import simpleGit from 'simple-git';
import { URL, fileURLToPath } from 'url';

import {
	addConfigFields,
	addFields,
	ALLOWED_CONFIG_KEYS,
	cloneFields,
	commitFields,
	logFields,
	pushFields,
	reflogFields,
	switchBranchFields,
	tagFields,
} from './descriptions';
import { mapGitConfigList, validateGitReference } from './GenericFunctions';

const REMOTE_HELPER_TRANSPORT = /^[a-zA-Z][a-zA-Z0-9+.-]*::/;

export class Git implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Git',
		name: 'git',
		icon: 'file:git.svg',
		group: ['transform'],
		version: [1, 1.1],
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
						name: 'Reflog',
						value: 'reflog',
						description: 'Return reference log',
						action: 'Return reference log',
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
			...reflogFields,
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

			validateGitReference(branchName, this.getNode());

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

		const hasUrlScheme = (repositoryPath: string) =>
			/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(repositoryPath);

		const isSshRepositoryPath = (repositoryPath: string) =>
			/^(?:[^@\s]+@)?[^:\s]+:.+/.test(repositoryPath);

		const assertLocalRepositoryPathAllowed = async (
			repositoryPath: string,
			repositoryType: 'source' | 'target',
			baseDir: string,
		): Promise<void> => {
			const absoluteLocalRepositoryPath = isAbsolute(repositoryPath)
				? repositoryPath
				: resolve(baseDir, repositoryPath);
			const resolvedLocalRepositoryPath = await this.helpers.resolvePath(
				absoluteLocalRepositoryPath,
			);

			if (this.helpers.isFilePathBlocked(resolvedLocalRepositoryPath)) {
				throw new NodeOperationError(
					this.getNode(),
					`Access to the ${repositoryType} repository path is not allowed`,
				);
			}
		};

		const assertRepositoryReferenceAllowed = async (
			repository: string,
			repositoryType: 'source' | 'target',
			baseDir: string,
		) => {
			const trimmedRepository = repository.trim();
			if (trimmedRepository.startsWith('-')) {
				throw new NodeOperationError(
					this.getNode(),
					`${repositoryType === 'source' ? 'Source' : 'Target'} repository cannot start with a hyphen`,
				);
			}

			if (/^[a-zA-Z]:[\\/]/.test(trimmedRepository)) {
				await assertLocalRepositoryPathAllowed(trimmedRepository, repositoryType, baseDir);
				return;
			}

			if (REMOTE_HELPER_TRANSPORT.test(trimmedRepository)) {
				throw new NodeOperationError(
					this.getNode(),
					`${repositoryType === 'source' ? 'Source' : 'Target'} repository protocol is not allowed`,
				);
			}

			if (hasUrlScheme(trimmedRepository)) {
				let repositoryUrl: URL | undefined;
				try {
					repositoryUrl = new URL(trimmedRepository);
				} catch {
					repositoryUrl = undefined;
				}

				if (repositoryUrl?.protocol === 'file:') {
					await assertLocalRepositoryPathAllowed(
						fileURLToPath(repositoryUrl),
						repositoryType,
						baseDir,
					);
				}

				return;
			}

			if (!isSshRepositoryPath(trimmedRepository)) {
				await assertLocalRepositoryPathAllowed(trimmedRepository, repositoryType, baseDir);
			}
		};

		const getRemoteOriginTargetRepositories = (
			configValues: Record<string, Record<string, string | string[] | undefined>>,
		) => {
			const remoteOriginUrls: string[] = [];
			const remoteOriginPushUrls: string[] = [];

			for (const values of Object.values(configValues)) {
				for (const key of ['remote.origin.url', 'remote.origin.pushurl'] as const) {
					const value = values[key];
					if (value === undefined) {
						continue;
					}

					if (typeof value !== 'string') {
						throw new NodeOperationError(this.getNode(), 'Target repository is required');
					}

					if (key === 'remote.origin.pushurl') {
						remoteOriginPushUrls.push(value);
					} else {
						remoteOriginUrls.push(value);
					}
				}
			}

			return {
				validationTargets: [...remoteOriginUrls, ...remoteOriginPushUrls],
				pushTarget: remoteOriginPushUrls[0] ?? remoteOriginUrls[0],
			};
		};

		const isFileNotFoundError = (error: unknown) =>
			error instanceof Error && 'code' in error && error.code === 'ENOENT';

		const resolvePathAllowingMissingParents = async (path: string): Promise<ResolvedFilePath> => {
			try {
				return await this.helpers.resolvePath(path);
			} catch (error) {
				if (!isFileNotFoundError(error)) {
					throw error;
				}

				const parentPath = dirname(path);
				if (parentPath === path) {
					throw error;
				}

				const resolvedParentPath = await resolvePathAllowingMissingParents(parentPath);
				return join(resolvedParentPath, basename(path)) as ResolvedFilePath;
			}
		};

		const operation = this.getNodeParameter('operation', 0);
		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const repositoryPath = this.getNodeParameter('repositoryPath', itemIndex, '') as string;
				const resolvedRepositoryPath =
					operation === 'clone'
						? await resolvePathAllowingMissingParents(repositoryPath)
						: await this.helpers.resolvePath(repositoryPath);

				const isFilePathBlocked = this.helpers.isFilePathBlocked(resolvedRepositoryPath);
				if (isFilePathBlocked) {
					throw new NodeOperationError(
						this.getNode(),
						'Access to the repository path is not allowed',
					);
				}

				const options = this.getNodeParameter('options', itemIndex, {});

				let sourceRepository = '';
				if (operation === 'clone') {
					sourceRepository = this.getNodeParameter('sourceRepository', itemIndex, '') as string;
					await assertRepositoryReferenceAllowed(
						sourceRepository,
						'source',
						dirname(resolvedRepositoryPath),
					);
					sourceRepository = await prepareRepository(sourceRepository);
				}

				let customTargetRepository = '';
				if (operation === 'push' && options.repository) {
					customTargetRepository = options.targetRepository as string;
					await assertRepositoryReferenceAllowed(
						customTargetRepository,
						'target',
						resolvedRepositoryPath,
					);
				}

				let cloneStagingBase = '';
				let cloneStagingPath = '';
				if (operation === 'clone') {
					// Clone into an unguessable staging directory under a fixed base, then
					// move the result into place, so the git subprocess only ever resolves
					// paths under a directory n8n controls.
					cloneStagingBase = await this.helpers.resolveStagingBaseForTarget(resolvedRepositoryPath);
					cloneStagingPath = join(
						cloneStagingBase,
						`.n8n-clone-${randomBytes(12).toString('hex')}`,
					);
					await mkdir(cloneStagingPath);
				}

				const gitConfig: string[] = [];
				const deploymentConfig = Container.get(DeploymentConfig);
				const isCloud = deploymentConfig.type === 'cloud';
				const securityConfig = Container.get(SecurityConfig);
				const disableBareRepos = securityConfig.disableBareRepos;
				if (isCloud || disableBareRepos) {
					gitConfig.push('safe.bareRepository=explicit');
				}

				const enableHooks = securityConfig.enableGitNodeHooks;
				if (!enableHooks) {
					gitConfig.push('core.hooksPath=/dev/null');
				}

				const gitOptions: Partial<SimpleGitOptions> = {
					baseDir: operation === 'clone' ? cloneStagingBase : resolvedRepositoryPath,
					config: gitConfig,
					// simple-git blocks callers from setting `core.hooksPath` via `config`
					// unless this flag is set. We set it deliberately as a mitigation, so
					// opt in to keep that mitigation working.
					...(!enableHooks && { unsafe: { allowUnsafeHooksPath: true } }),
				};

				const cleanEnv = Object.create(null) as Record<string, unknown>;
				// Tell git not to ask for any information via the terminal like for
				// example the username. As nobody will be able to answer it would
				// n8n keep on waiting forever.
				cleanEnv['GIT_TERMINAL_PROMPT'] = '0';
				cleanEnv['GIT_ALLOW_PROTOCOL'] = 'file:git:http:https:ssh';
				const git: SimpleGit = simpleGit(gitOptions).env(cleanEnv);

				if (operation === 'add') {
					// ----------------------------------
					//         add
					// ----------------------------------

					const pathsToAdd = this.getNodeParameter('pathsToAdd', itemIndex, '') as string;
					const paths = pathsToAdd
						.split(',')
						.map((p) => p.trim())
						.filter((p) => p.length > 0);

					// Use -- separator to prevent argument injection
					await git.add(['--', ...paths]);

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
					const securityConfig = Container.get(SecurityConfig);
					const enableGitNodeAllConfigKeys = securityConfig.enableGitNodeAllConfigKeys;
					let append = false;
					if (!enableGitNodeAllConfigKeys && !ALLOWED_CONFIG_KEYS.includes(key)) {
						throw new NodeOperationError(
							this.getNode(),
							`The provided git config key '${key}' is not allowed`,
						);
					}

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

					try {
						await git.clone(sourceRepository, cloneStagingPath, ['--']);

						const pinnedParent = await this.helpers.pinDirectory(dirname(resolvedRepositoryPath), {
							create: true,
						});
						try {
							const renameTarget = pinnedParent
								? pinnedParent.resolvePath(basename(resolvedRepositoryPath))
								: resolvedRepositoryPath;
							if (!pinnedParent) {
								await this.helpers.ensureParentDirectoryWithoutFollowingSymlinks(
									resolvedRepositoryPath,
								);
								await this.helpers.assertNoSymlinkInPath(resolvedRepositoryPath);
							}
							await rename(cloneStagingPath, renameTarget);
						} catch (error) {
							if (error instanceof Error && 'code' in error && error.code === 'EXDEV') {
								throw new NodeOperationError(
									this.getNode(),
									'Cannot clone to a path on a different filesystem than the n8n data directory',
								);
							}
							throw error;
						} finally {
							await pinnedParent?.close();
						}
					} finally {
						await rm(cloneStagingPath, { recursive: true, force: true }).catch(() => {});
					}

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
						pathsToAdd = (options.pathsToAdd as string)
							.split(',')
							.map((p) => p.trim())
							.filter((p) => p.length > 0);
					}

					// Use -- separator to prevent argument injection
					if (pathsToAdd && pathsToAdd.length > 0) {
						await git.commit(message, ['--', ...pathsToAdd]);
					} else {
						await git.commit(message);
					}

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
						if (customTargetRepository === '') {
							throw new NodeOperationError(this.getNode(), 'Target repository is required');
						}
						const targetRepository = await prepareRepository(customTargetRepository);
						await git.push(targetRepository);
					} else {
						const authentication = this.getNodeParameter('authentication', 0) as string;
						const config = await git.listConfig();
						const { validationTargets, pushTarget } = getRemoteOriginTargetRepositories(
							config.values,
						);

						for (const targetRepository of validationTargets) {
							await assertRepositoryReferenceAllowed(
								targetRepository,
								'target',
								resolvedRepositoryPath,
							);
						}

						if (authentication === 'gitPassword') {
							if (pushTarget === undefined) {
								throw new NodeOperationError(this.getNode(), 'Target repository is required');
							}

							const targetRepository = await prepareRepository(pushTarget);
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
				} else if (operation === 'reflog') {
					// ----------------------------------
					//         reflog
					// ----------------------------------

					const returnAll = this.getNodeParameter('returnAll', itemIndex, false);

					let reference = 'HEAD';
					if (options.reference !== undefined && options.reference !== '') {
						assertParamIsString('reference', options.reference, this.getNode());
						validateGitReference(options.reference, this.getNode());

						reference = options.reference;
					}

					const reflogResult = await git.raw(['reflog', reference]);

					const reflogEntries = reflogResult
						.trim()
						.split('\n')
						.filter((line) => line.length > 0)
						.map((line) => {
							// reflog format: hash ref@{number}: action: message
							const match = line.match(/^(\S+)\s+(.+?):\s+(.+?):\s+(.+)$/);
							if (match) {
								return {
									hash: match[1],
									ref: match[2],
									action: match[3],
									message: match[4],
									raw: line,
								};
							}
							return {
								raw: line,
							};
						});

					const entries = returnAll
						? reflogEntries
						: reflogEntries.slice(0, this.getNodeParameter('limit', itemIndex, 100));

					returnItems.push.apply(
						returnItems,
						this.helpers.returnJsonArray(entries).map((item) => {
							return {
								...item,
								pairedItem: { item: itemIndex },
							};
						}),
					);
				} else if (operation === 'listConfig') {
					// ----------------------------------
					//         listConfig
					// ----------------------------------

					const config = await git.listConfig();

					const data = mapGitConfigList(config);

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
