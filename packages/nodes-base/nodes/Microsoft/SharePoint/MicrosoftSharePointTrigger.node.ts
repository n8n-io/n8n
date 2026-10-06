import {
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import { DRIVE_ID_HINT, DRIVE_ID_REGEX, getDrives, resolveDriveId } from './drive';
import { getLists, resolveListId } from './list';
import { getSites, resolveSiteId, SITE_ID_REGEX } from './site';
import { getSharePointCredentialType, SERVICE_PRINCIPAL_AUTH } from './transport';
import { isTargetMissing, microsoftApiRequestDelta } from './transport/delta';
import {
	selectChanges,
	TRIGGER_EVENTS,
	type DeltaFeed,
	type SharePointEvent,
} from './trigger/changes';
import {
	clearError,
	cursorFor,
	errorKeyOf,
	noteError,
	rearm,
	saveCursor,
	scopeOf,
	type PollState,
} from './trigger/state';

export class MicrosoftSharePointTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft SharePoint Trigger',
		name: 'microsoftSharePointTrigger',
		icon: {
			light: 'file:microsoftSharePoint.svg',
			dark: 'file:microsoftSharePoint.svg',
		},
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when a file or list item changes in Microsoft SharePoint',
		subtitle: '',
		defaults: {
			name: 'Microsoft SharePoint Trigger',
		},
		// The v1 credential (microsoftSharePointOAuth2Api) is not offered: its
		// tokens target the legacy {subdomain}.sharepoint.com/_api host and fail
		// against Graph.
		credentials: [
			{
				name: 'microsoftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOAuth2Api'],
					},
				},
			},
			{
				name: SERVICE_PRINCIPAL_AUTH,
				required: true,
				displayOptions: {
					show: {
						authentication: [SERVICE_PRINCIPAL_AUTH],
					},
				},
			},
		],
		// Stays out of the node picker until the whole trigger is built. Note this
		// also labels the node "Deprecated" in the NDV until it is removed.
		hidden: true,
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Microsoft OAuth2 (Graph)',
						value: 'microsoftOAuth2Api',
						description:
							'Generic Microsoft Graph credential. Enable the scopes this trigger needs (e.g. Sites.Read.All) on the credential.',
					},
					{
						name: 'Microsoft Entra Service Principal (App-Only)',
						value: SERVICE_PRINCIPAL_AUTH,
						description:
							'App-only access via a Microsoft Entra app registration. Polling continues when no user is signed in.',
					},
				],
				default: 'microsoftOAuth2Api',
			},
			{
				displayName: 'Site',
				name: 'site',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The SharePoint site holding the library to watch',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'getSites', searchable: true },
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'e.g. https://contoso.sharepoint.com/sites/mysite',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^https://.+',
									errorMessage: 'The URL must start with https://',
								},
							},
						],
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. contoso.sharepoint.com,5a58bb09-…,9f0d…',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: SITE_ID_REGEX,
									errorMessage:
										'Use the ID from the site picker or Graph (hostname,GUID,GUID), a site GUID, a hostname, or "root". For a site address, switch the field to URL mode.',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Document Library',
						value: 'documentLibrary',
						description: 'Watch the files in a document library',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Watch the items in a list',
					},
				],
				default: 'documentLibrary',
				displayOptions: { hide: { site: [''] } },
			},
			{
				displayName: 'Document Library',
				name: 'drive',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The document library to watch for changes',
				displayOptions: { show: { resource: ['documentLibrary'] }, hide: { site: [''] } },
				typeOptions: { loadOptionsDependsOn: ['site.value'] },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'getDrives', searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. b!zXyF9k…',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: DRIVE_ID_REGEX,
									errorMessage: DRIVE_ID_HINT,
								},
							},
						],
					},
				],
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The list to watch for changes',
				displayOptions: { show: { resource: ['list'] }, hide: { site: [''] } },
				typeOptions: { loadOptionsDependsOn: ['site.value'] },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'getLists', searchable: true },
					},
					{
						displayName: 'By ID or Title',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 58a279af-1f06-4392-a5ed-2b37fa1d6c1d or My List',
					},
				],
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['changed', 'deleted'],
				description: 'Which changes in the library start the workflow',
				options: [
					{
						name: 'Changed',
						value: 'changed',
						description:
							"A file was added, edited, renamed, or moved. Graph reports each item's latest state rather than every change, so a new file and an edited one arrive the same way.",
					},
					{
						name: 'Deleted',
						value: 'deleted',
						description:
							'A file was deleted. Graph drops most fields from a deletion entry, so it carries little beyond the ID.',
					},
				],
			},
		],
	};

	methods = {
		listSearch: { getSites, getDrives, getLists },
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const state = this.getWorkflowStaticData('node') as PollState;
		// A manual run must not consume real events, so it neither reads nor writes
		// the cursor. It enumerates from the start instead, to produce sample data.
		const manual = this.getMode() === 'manual';
		const resource = this.getNodeParameter('resource', 'documentLibrary') as string;
		const watchingList = resource === 'list';
		const feed: DeltaFeed = watchingList ? 'listItem' : 'driveItem';
		let siteId = '';
		let targetId = '';

		try {
			siteId = await resolveSiteId.call(this, 0);
			targetId = watchingList
				? await resolveListId.call(this, 0)
				: await resolveDriveId.call(this, 0);
			const events = this.getNodeParameter('events', [...TRIGGER_EVENTS]) as SharePointEvent[];
			const scope = scopeOf(getSharePointCredentialType.call(this), resource, siteId, targetId);

			// Switching between the two resources changes the scope, so the stored
			// cursor is dropped rather than replayed against the other feed.
			const startCursor = manual ? undefined : cursorFor(state, scope);
			const budget = {
				deadlineEpochMs: manual ? undefined : Date.now() + this.getPollBudgetMs(),
				maxPages: manual ? 1 : undefined,
			};

			const page = await microsoftApiRequestDelta.call(
				this,
				watchingList
					? { feed: 'listItem', siteId, listId: targetId, cursor: startCursor, ...budget }
					: // `deltaExcludeParent` has no listItem equivalent, so the list feed's
						// ancestors are dropped by content type instead.
						{
							feed: 'driveItem',
							driveId: targetId,
							excludeParents: true,
							cursor: startCursor,
							...budget,
						},
			);

			if (page.resync) {
				// The 410 carries a Location that restarts a full enumeration. This
				// trigger reports changes rather than mirroring a library, so it
				// re-arms from now and accepts the gap instead of replaying everything.
				if (!manual) rearm(state, scope);
				clearError(state);
				this.logger.warn(
					`Microsoft SharePoint Trigger: the change cursor expired (${page.resync.code}). Watching from now on.`,
				);
				return null;
			}

			// A long drain returns a nextLink rather than a deltaLink. Saving it
			// resumes mid-enumeration instead of restarting the backlog.
			const cursor = page.deltaLink ?? page.nextLink;
			if (!manual && cursor !== undefined) saveCursor(state, scope, cursor);
			clearError(state);

			const items = selectChanges(page.items, events, feed);
			return items.length > 0 ? [this.helpers.returnJsonArray(items)] : null;
		} catch (error) {
			const label = watchingList ? 'list' : 'document library';
			const reported = isTargetMissing(error)
				? new NodeOperationError(
						this.getNode(),
						`The ${label} being watched is no longer reachable`,
						{
							description: `Microsoft Graph returned 404 for ${label} ${targetId} on site ${siteId}. The ${label} was most likely deleted. ${watchingList ? 'A rename causes this only when the list is given by title rather than by ID.' : 'A rename does not cause this, because the node watches by ID.'} A credential that lost access returns a permission error instead. The saved position is kept, so polling resumes if the ${label} comes back.`,
						},
					)
				: error;

			// A manual run is the user watching, so it always reports.
			if (manual) throw reported;

			const key = errorKeyOf(reported);
			if (noteError(state, key, Date.now())) throw reported;

			this.logger.warn(
				`Microsoft SharePoint Trigger: still failing with "${key}". The next report is up to an hour away.`,
			);
			return null;
		}
	}
}
