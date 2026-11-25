import { randomBytes } from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError, NodeOperationError, requestPath } from 'n8n-workflow';

import { githubApiRequest } from './GenericFunctions';
import { getHooksPath, verifySignature } from './GithubTriggerHelpers';
import { getOrganizations, getRepositories, getUsers } from './SearchFunctions';

const CANNOT_CREATE_MESSAGE = 'Github refused to create the webhook for this workflow';

/** Github's reason is in `description`; NodeApiError overwrites `message` on a 4XX. */
function describeGithubRejection(error: unknown): string {
	const reason = (error as { description?: string } | undefined)?.description;
	const advice =
		'If a webhook for this URL already exists on the repository or organization, delete it there and activate the workflow again.';

	return reason ? `Github said: ${reason}. ${advice}` : advice;
}

/** The owner field has a different label for each resource. Both write the same `owner` parameter. */
function getOwnerProperty(
	resource: 'repository' | 'organization',
	displayName: string,
	placeholder: string,
): INodeProperties {
	return {
		displayName,
		name: 'owner',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: [resource],
			},
		},
		modes: [
			{
				displayName,
				name: 'list',
				type: 'list',
				placeholder,
				typeOptions: {
					searchListMethod: resource === 'organization' ? 'getOrganizations' : 'getUsers',
					searchable: true,
					searchFilterRequired: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://github.com/n8n-io',
				extractValue: {
					type: 'regex',
					regex: 'https:\\/\\/(?:[^/]+)\\/([-_0-9a-zA-Z]+)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'https:\\/\\/([^/]+)\\/([-_0-9a-zA-Z]+)(?:.*)',
							errorMessage: 'Not a valid Github URL',
						},
					},
				],
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'e.g. n8n-io',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[-_a-zA-Z0-9]+',
							errorMessage: 'Not a valid Github Owner Name',
						},
					},
				],
				url: '=https://github.com/{{$value}}',
			},
		],
	};
}

export class GithubTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Github Trigger',
		name: 'githubTrigger',
		schemaPath: 'Github',
		icon: { light: 'file:github.svg', dark: 'file:github.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{$parameter["resource"] === "organization" ? $parameter["owner"] : $parameter["owner"] + "/" + $parameter["repository"]}}: {{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Github events occur',
		defaults: {
			name: 'Github Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'githubApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'githubOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'githubAppApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['githubAppApi'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Only members with owner privileges for an organization or admin privileges for a repository can set up the webhooks this node requires.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'GitHub App',
						value: 'githubAppApi',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Organization',
						value: 'organization',
						description: 'Receive events from every repository of an organization',
					},
					{
						name: 'Repository',
						value: 'repository',
					},
				],
				default: 'repository',
			},
			getOwnerProperty('repository', 'Repository Owner', 'Select an owner...'),
			getOwnerProperty('organization', 'Organization', 'Select an organization...'),
			{
				displayName: 'Repository Name',
				name: 'repository',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['repository'],
					},
				},
				modes: [
					{
						displayName: 'Repository Name',
						name: 'list',
						type: 'list',
						placeholder: 'Select an Repository...',
						typeOptions: {
							searchListMethod: 'getRepositories',
							searchable: true,
						},
					},
					{
						displayName: 'Link',
						name: 'url',
						type: 'string',
						placeholder: 'e.g. https://github.com/n8n-io/n8n',
						extractValue: {
							type: 'regex',
							regex: 'https:\\/\\/(?:[^/]+)\\/(?:[-_0-9a-zA-Z]+)\\/([-_.0-9a-zA-Z]+)',
						},
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'https:\\/\\/([^/]+)\\/(?:[-_0-9a-zA-Z]+)\\/([-_.0-9a-zA-Z]+)(?:.*)',
									errorMessage: 'Not a valid Github Repository URL',
								},
							},
						],
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. n8n',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[-_.0-9a-zA-Z]+',
									errorMessage: 'Not a valid Github Repository Name',
								},
							},
						],
						url: '=https://github.com/{{$parameter["owner"]}}/{{$value}}',
					},
				],
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event)',
					},
					{
						name: 'Branch Protection Configuration',
						value: 'branch_protection_configuration',
						description: 'Triggered when branch protection is enabled or disabled for a repository',
					},
					{
						name: 'Branch Protection Rule',
						value: 'branch_protection_rule',
						description: 'Triggered when a branch protection rule is created, edited, or deleted',
					},
					{
						name: 'Check Run',
						value: 'check_run',
						description:
							'Triggered when a check run is created, rerequested, completed, or has a requested_action',
					},
					{
						name: 'Check Suite',
						value: 'check_suite',
						description: 'Triggered when a check suite is completed, requested, or rerequested',
					},
					{
						name: 'Code Scanning Alert',
						value: 'code_scanning_alert',
						description:
							'Triggered when a code scanning alert is created, fixed, reopened, closed, or changes branch or assignee',
					},
					{
						name: 'Commit Comment',
						value: 'commit_comment',
						description: 'Triggered when a commit comment is created',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Represents a created repository, branch, or tag',
					},
					{
						name: 'Custom Property Values',
						value: 'custom_property_values',
						description: 'Triggered when the custom property values of a repository change',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Represents a deleted branch or tag',
					},
					{
						name: 'Dependabot Alert',
						value: 'dependabot_alert',
						description:
							'Triggered when a Dependabot alert is created, dismissed, fixed, reopened, reintroduced, or withdrawn',
					},
					{
						name: 'Deploy Key',
						value: 'deploy_key',
						description: 'Triggered when a deploy key is added or removed from a repository',
					},
					{
						name: 'Deployment',
						value: 'deployment',
						description: 'Represents a deployment',
					},
					{
						name: 'Deployment Status',
						value: 'deployment_status',
						description: 'Represents a deployment status',
					},
					{
						name: 'Discussion',
						value: 'discussion',
						description:
							'Triggered when a discussion is created, edited, answered, closed, reopened, labeled, locked, pinned, transferred, or deleted',
					},
					{
						name: 'Discussion Comment',
						value: 'discussion_comment',
						description: 'Triggered when a discussion comment is created, edited, or deleted',
					},
					{
						name: 'Fork',
						value: 'fork',
						description: 'Triggered when a user forks a repository',
					},
					{
						name: 'Github App Authorization',
						value: 'github_app_authorization',
						description: 'Triggered when someone revokes their authorization of a GitHub App',
					},
					{
						name: 'Gollum',
						value: 'gollum',
						description: 'Triggered when a Wiki page is created or updated',
					},
					{
						name: 'Installation',
						value: 'installation',
						description:
							'Triggered when someone installs (created), uninstalls (deleted), or accepts new permissions (new_permissions_accepted) for a GitHub App. When a GitHub App owner requests new permissions, the person who installed the GitHub App must accept the new permissions request.',
					},
					{
						name: 'Installation Repositories',
						value: 'installation_repositories',
						description: 'Triggered when a repository is added or removed from an installation',
					},
					{
						name: 'Issue Comment',
						value: 'issue_comment',
						description: 'Triggered when an issue comment is created, edited, or deleted',
					},
					{
						name: 'Issue Dependencies',
						value: 'issue_dependencies',
						description:
							'Triggered when a "blocked by" or "blocking" relationship between issues is added or removed',
					},
					{
						name: 'Issue Relates To',
						value: 'issue_relates_to',
						description:
							'Triggered when a "relates to" relationship between issues is added or removed',
					},
					{
						name: 'Issues',
						value: 'issues',
						description:
							'Triggered when an issue is opened, edited, deleted, transferred, pinned, unpinned, closed, reopened, assigned, unassigned, labeled, unlabeled, locked, unlocked, milestoned, or demilestoned',
					},
					{
						name: 'Label',
						value: 'label',
						description: "Triggered when a repository's label is created, edited, or deleted",
					},
					{
						name: 'Marketplace Purchase',
						value: 'marketplace_purchase',
						description:
							'Triggered when someone purchases a GitHub Marketplace plan, cancels their plan, upgrades their plan (effective immediately), downgrades a plan that remains pending until the end of the billing cycle, or cancels a pending plan change',
					},
					{
						name: 'Member',
						value: 'member',
						description:
							'Triggered when a user accepts an invitation or is removed as a collaborator to a repository, or has their permissions changed',
					},
					{
						name: 'Membership',
						value: 'membership',
						description:
							'Triggered when a user is added or removed from a team. Organization hooks only.',
					},
					{
						name: 'Meta',
						value: 'meta',
						description: 'Triggered when the webhook that this event is configured on is deleted',
					},
					{
						name: 'Milestone',
						value: 'milestone',
						description:
							'Triggered when a milestone is created, closed, opened, edited, or deleted',
					},
					{
						name: 'Org Block',
						value: 'org_block',
						description:
							'Triggered when an organization blocks or unblocks a user. Organization hooks only.',
					},
					{
						name: 'Organization',
						value: 'organization',
						description:
							'Triggered when an organization is deleted and renamed, and when a user is added, removed, or invited to an organization. Organization hooks only.',
					},
					{
						name: 'Package',
						value: 'package',
						description: 'Triggered when a GitHub Packages package is published or updated',
					},
					{
						name: 'Page Build',
						value: 'page_build',
						description:
							'Triggered on push to a GitHub Pages enabled branch (gh-pages for project pages, master for user and organization pages)',
					},
					{
						name: 'Project',
						value: 'project',
						description:
							'Triggered when a project is created, updated, closed, reopened, or deleted',
					},
					{
						name: 'Project Card',
						value: 'project_card',
						description:
							'Triggered when a project card is created, edited, moved, converted to an issue, or deleted',
					},
					{
						name: 'Project Column',
						value: 'project_column',
						description: 'Triggered when a project column is created, updated, moved, or deleted',
					},
					{
						name: 'Public',
						value: 'public',
						description: 'Triggered when a private repository is open sourced',
					},
					{
						name: 'Pull Request',
						value: 'pull_request',
						description:
							'Triggered when a pull request is assigned, unassigned, labeled, unlabeled, opened, edited, closed, reopened, synchronize, ready_for_review, locked, unlocked, a pull request review is requested, or a review request is removed',
					},
					{
						name: 'Pull Request Review',
						value: 'pull_request_review',
						description:
							'Triggered when a pull request review is submitted into a non-pending state, the body is edited, or the review is dismissed',
					},
					{
						name: 'Pull Request Review Comment',
						value: 'pull_request_review_comment',
						description:
							"Triggered when a comment on a pull request's unified diff is created, edited, or deleted (in the Files Changed tab)",
					},
					{
						name: 'Pull Request Review Thread',
						value: 'pull_request_review_thread',
						description: 'Triggered when a pull request review thread is resolved or unresolved',
					},
					{
						name: 'Push',
						value: 'push',
						description:
							'Triggered on a push to a repository branch. Branch pushes and repository tag pushes also trigger webhook push events. This is the default event.',
					},
					{
						name: 'Registry Package',
						value: 'registry_package',
						description:
							'Triggered when a GitHub Packages registry package is published or updated',
					},
					{
						name: 'Release',
						value: 'release',
						description:
							'Triggered when a release is published, unpublished, created, edited, deleted, or prereleased',
					},
					{
						name: 'Repository',
						value: 'repository',
						description:
							'Triggered when a repository is created, archived, unarchived, renamed, edited, transferred, made public, or made private. Organization hooks are also triggered when a repository is deleted.',
					},
					{
						name: 'Repository Advisory',
						value: 'repository_advisory',
						description: 'Triggered when a repository security advisory is reported or published',
					},
					{
						name: 'Repository Import',
						value: 'repository_import',
						description:
							'Triggered when a successful, cancelled, or failed repository import finishes for a GitHub organization or a personal repository',
					},
					{
						name: 'Repository Ruleset',
						value: 'repository_ruleset',
						description: 'Triggered when a repository ruleset is created, edited, or deleted',
					},
					{
						name: 'Repository Vulnerability Alert',
						value: 'repository_vulnerability_alert',
						description: 'Triggered when a security alert is created, dismissed, or resolved',
					},
					{
						name: 'Secret Scanning Alert',
						value: 'secret_scanning_alert',
						description:
							'Triggered when a secret scanning alert is created, resolved, reopened, validated, assigned, or publicly leaked',
					},
					{
						name: 'Secret Scanning Alert Location',
						value: 'secret_scanning_alert_location',
						description:
							'Triggered when a new location is found for a secret in a secret scanning alert',
					},
					{
						name: 'Secret Scanning Scan',
						value: 'secret_scanning_scan',
						description: 'Triggered when secret scanning completes certain scans on a repository',
					},
					{
						name: 'Security Advisory',
						value: 'security_advisory',
						description:
							'Triggered when a new security advisory is published, updated, or withdrawn',
					},
					{
						name: 'Security And Analysis',
						value: 'security_and_analysis',
						description:
							'Triggered when code security and analysis features are enabled or disabled for a repository',
					},
					{
						name: 'Star',
						value: 'star',
						description: 'Triggered when a star is added or removed from a repository',
					},
					{
						name: 'Status',
						value: 'status',
						description: 'Triggered when the status of a Git commit changes',
					},
					{
						name: 'Sub Issues',
						value: 'sub_issues',
						description: 'Triggered when a sub-issue is added to or removed from an issue',
					},
					{
						name: 'Team',
						value: 'team',
						description:
							"Triggered when an organization's team is created, deleted, edited, added_to_repository, or removed_from_repository. Organization hooks only.",
					},
					{
						name: 'Team Add',
						value: 'team_add',
						description: 'Triggered when a repository is added to a team',
					},
					{
						name: 'Watch',
						value: 'watch',
						description: 'Triggered when someone stars a repository',
					},
					{
						name: 'Workflow Job',
						value: 'workflow_job',
						description:
							'Triggered when a GitHub Actions job is queued, waiting, in progress, or completed',
					},
					{
						name: 'Workflow Run',
						value: 'workflow_run',
						description:
							'Triggered when a GitHub Actions workflow run is requested, in progress, or completed',
					},
				],
				required: true,
				default: [],
				description: 'The events to listen to',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Insecure SSL',
						name: 'insecureSSL',
						type: 'boolean',
						default: false,
						description:
							'Whether the SSL certificate of the n8n host be verified by GitHub when delivering payloads',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}

				// Same falsy test as `verifySignature`: a blank secret must not count as
				// present here and absent there.
				if (!webhookData.webhookSecret) {
					return false;
				}

				// Webhook got created before so check if it still exists
				const endpoint = requestPath`${getHooksPath.call(this)}/${webhookData.webhookId}`;

				try {
					await githubApiRequest.call(this, 'GET', endpoint, {});
				} catch (error) {
					if (error.httpCode === '404') {
						// Webhook does not exist
						delete webhookData.webhookId;
						delete webhookData.webhookEvents;
						delete webhookData.webhookSecret;

						return false;
					}

					// Some error occurred
					throw error;
				}
				// If it did not error then the webhook exists
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				if (webhookUrl.includes('//localhost')) {
					throw new NodeOperationError(
						this.getNode(),
						'The Webhook can not work on "localhost". Please setup n8n on a custom domain.',
					);
				}

				const events = this.getNodeParameter('events', []);

				const endpoint = getHooksPath.call(this);
				const options = this.getNodeParameter('options') as { insecureSSL: boolean };

				// Generate a secure random secret for webhook signature verification
				const webhookSecret = randomBytes(32).toString('hex');

				const body = {
					name: 'web',
					config: {
						url: webhookUrl,
						content_type: 'json',
						insecure_ssl: options.insecureSSL ? '1' : '0',
						secret: webhookSecret,
					},
					events,
					active: true,
				};

				const webhookData = this.getWorkflowStaticData('node');

				let responseData;
				try {
					responseData = await githubApiRequest.call(this, 'POST', endpoint, body);
				} catch (error) {
					if (error.httpCode === '422') {
						// Webhook exists already

						// Without a stored id there is no hook to fetch, so nothing is adoptable.
						if (webhookData.webhookId === undefined) {
							throw new NodeOperationError(this.getNode(), CANNOT_CREATE_MESSAGE, {
								description: describeGithubRejection(error),
								level: 'warning',
							});
						}

						// Asking for it by id is what makes adopting someone else's hook
						// impossible: Github never returns a hook's secret, so rotating ours onto a
						// foreign hook would silently rewrite their config.
						let existingWebhook: IDataObject;
						try {
							existingWebhook = await githubApiRequest.call(
								this,
								'GET',
								requestPath`${endpoint}/${webhookData.webhookId}`,
								{},
							);
						} catch (error2) {
							if (error2.httpCode === '404') {
								// Ours is gone, so whatever Github is objecting to is not ours to fix.
								throw new NodeOperationError(this.getNode(), CANNOT_CREATE_MESSAGE, {
									description: describeGithubRejection(error),
									level: 'warning',
								});
							}

							throw error2;
						}

						// A different URL means some other hook is the one Github is objecting to,
						// and repointing this one would leave two hooks on the same URL.
						if ((existingWebhook.config as IDataObject | undefined)?.url !== webhookUrl) {
							throw new NodeOperationError(this.getNode(), CANNOT_CREATE_MESSAGE, {
								description: describeGithubRejection(error),
								level: 'warning',
							});
						}

						// `active` is re-asserted so a disabled hook cannot look like a successful
						// activation.
						let patchResponse;
						try {
							patchResponse = await githubApiRequest.call(
								this,
								'PATCH',
								requestPath`${endpoint}/${existingWebhook.id}`,
								{ config: body.config, events, active: true },
							);
						} catch (patchError) {
							// Re-label in place: NodeApiError's constructor hands back the instance it
							// is given unchanged, so building a new one would drop this message.
							if (patchError instanceof NodeApiError) {
								patchError.message =
									'The Github webhook for this URL already exists but could not be updated with a signing secret';
								patchError.description = [
									patchError.description,
									"Check that the credential is allowed to manage this repository's webhooks, or delete the webhook on Github and activate the workflow again.",
								]
									.filter(Boolean)
									.join(' ');
							}

							throw patchError;
						}

						if (patchResponse?.active !== true) {
							throw new NodeApiError(this.getNode(), (patchResponse ?? {}) as JsonObject, {
								message: 'Github did not apply the update to the existing webhook',
								description:
									'The webhook exists but could not be enabled with a signing secret. Delete it on Github and activate the workflow again.',
								level: 'warning',
							});
						}

						webhookData.webhookId = String(existingWebhook.id);
						webhookData.webhookEvents = existingWebhook.events as string[];
						webhookData.webhookSecret = webhookSecret;

						return true;
					}

					if (error.httpCode === '404') {
						throw new NodeOperationError(
							this.getNode(),
							'Check that the repository or organization exists and that you have permission to create the webhooks this node requires',
							{ level: 'warning' },
						);
					}

					throw error;
				}

				if (responseData.id === undefined || responseData.active !== true) {
					// Required data is missing so was not successful
					throw new NodeApiError(this.getNode(), responseData as JsonObject, {
						message: 'Github webhook creation response did not contain the expected data.',
					});
				}

				const strandedWebhookId = webhookData.webhookId;

				webhookData.webhookId = responseData.id as string;
				webhookData.webhookEvents = responseData.events as string[];
				webhookData.webhookSecret = webhookSecret;

				if (strandedWebhookId !== undefined) {
					this.logger.warn(
						`Github Trigger "${this.getNode().name}" registered a new webhook. Webhook ${String(strandedWebhookId)} may still be on the repository and is no longer tracked; check the repository's webhook settings.`,
						{ workflowId: this.getWorkflow().id, strandedWebhookId },
					);
				}

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const body = {};

					try {
						const endpoint = requestPath`${getHooksPath.call(this)}/${webhookData.webhookId}`;
						await githubApiRequest.call(this, 'DELETE', endpoint, body);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.webhookSecret;
				}

				return true;
			},
		},
	};

	methods = {
		listSearch: {
			getUsers,
			getOrganizations,
			getRepositories,
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Verify the webhook signature before processing
		if (!verifySignature.call(this)) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();

			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = this.getBodyData();

		// Check if the webhook is only the ping from Github to confirm if it works
		if (bodyData.hook_id !== undefined && bodyData.action === undefined) {
			// Is only the ping and not an actual webhook call. So return 'OK'
			// but do not start the workflow.

			return {
				webhookResponse: 'OK',
			};
		}

		// Is a regular webhook call

		// TODO: Add headers & requestPath
		const returnData: IDataObject[] = [];

		returnData.push({
			body: bodyData,
			headers: this.getHeaderData(),
			query: this.getQueryData(),
		});

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
