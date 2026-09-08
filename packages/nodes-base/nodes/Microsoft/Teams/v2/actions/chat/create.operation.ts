import {
	type INodeProperties,
	type IExecuteFunctions,
	type IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import { odataStringLiteral } from '@utils/microsoft/odata';
import { updateDisplayOptions } from '@utils/utilities';

import { throwIfChatUnsupported } from './sharedGuard';
import { stampItemIndexOnError, validateUserTargetId } from '../../../../GenericFunctions';
import { userRLC } from '../../descriptions';
import { resolveUserTarget, userTargetMessages } from '../../helpers/utils';
import { getGraphBaseUrl, microsoftApiRequest, SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Chat Type',
		name: 'chatType',
		type: 'options',
		default: 'oneOnOne',
		description: 'Whether to create a chat with one other person or a group chat',
		options: [
			{
				name: 'Group',
				value: 'group',
				description:
					'A chat with one or more other people. It can have a topic, and you can add members later.',
			},
			{
				name: 'One-on-One',
				value: 'oneOnOne',
				description:
					'A chat with exactly one other person. If a chat with that person already exists, Microsoft Teams returns it instead of creating a new one.',
			},
		],
	},
	{
		displayName: 'Other Participants',
		name: 'members',
		type: 'fixedCollection',
		placeholder: 'Add Participant',
		default: {},
		typeOptions: {
			multipleValues: true,
			minRequiredFields: 1,
		},
		description: 'The other people to add to the chat. You are added automatically.',
		options: [
			{
				displayName: 'Participant',
				name: 'member',
				values: [
					userRLC,
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						default: 'owner',
						description:
							'The role to give this participant. In-tenant guest accounts must use Guest. All other accounts use Owner.',
						options: [
							{
								name: 'Guest',
								value: 'guest',
							},
							{
								name: 'Owner',
								value: 'owner',
							},
						],
					},
					{
						displayName: 'Tenant ID',
						name: 'tenantId',
						type: 'string',
						default: '',
						placeholder: 'e.g. 4dc1fe35-8ac6-4f0d-904a-7ebcd364bea1',
						description:
							'Only for a user from another organization. Give that user as a user object ID, not an email address. Leave this empty for a user in your own tenant.',
					},
				],
			},
		],
	},
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		default: '',
		description: 'The name of the group chat, shown to all members',
		displayOptions: {
			show: {
				chatType: ['group'],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['chat'],
		operation: ['create'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/chat-post?view=graph-rest-1.0

	// App-only Graph has no signed-in user to create a chat for; fail before any request.
	throwIfChatUnsupported.call(this);

	const node = this.getNode();
	const chatType = this.getNodeParameter('chatType', i) as 'oneOnOne' | 'group';
	// The `''` fallback is required: `Workflow` strips hidden parameters before execution,
	// so on a oneOnOne the key is absent and a two-argument read throws.
	const topic = this.getNodeParameter('topic', i, '') as string;
	const raw = this.getNodeParameter('members.member', i, []);
	// An expression can resolve the field to something that is not a list. Say so, instead of
	// dropping every row and then reporting an empty participant list.
	if (raw !== undefined && raw !== null && !Array.isArray(raw)) {
		throw new NodeOperationError(node, 'Other Participants must be a list of participants', {
			itemIndex: i,
			description: 'An expression on this field returned a single value. Return a list instead.',
		});
	}
	const rows = Array.isArray(raw) ? (raw as IDataObject[]) : [];

	// Graph needs the initiator in `members`, and no author (or AI agent) knows that, so the
	// node adds them. Uncached, one request per item, as `task:getAll` already does.
	const me = (await microsoftApiRequest.call(
		this,
		'GET',
		'/v1.0/me',
		{},
		// `userType` is not in the default `/me` property set, so it has to be selected. The
		// principal name is the dedupe seed below, so it has to come along.
		{ $select: 'id,userPrincipalName,userType' },
	)) as IDataObject;
	// Graph requires the `guest` role for an in-tenant guest and 400s on `owner`.
	const callerRole = me.userType === 'Guest' ? 'guest' : 'owner';
	// Seeded with the principal name as well as the id: a federated row binds its raw value,
	// so a row naming the caller by UPN would escape an id-only dedupe and produce an opaque
	// Graph duplicate-member 400.
	const callerKeys = new Set(
		[String(me.id ?? ''), String(me.userPrincipalName ?? '')]
			.filter(Boolean)
			.map((key) => key.toLowerCase()),
	);

	const others: Array<{ id: string; role: string; tenantId?: string }> = [];
	const seen = new Set<string>();

	// One try around the whole row loop, so every per-row failure is attributed to this item.
	// `stampItemIndexOnError` never overwrites, so an index set deeper down survives.
	try {
		for (let n = 0; n < rows.length; n++) {
			const label = `participant ${n + 1}`;
			const rawValue = this.getNodeParameter(`members.member[${n}].userId`, i, '', {
				extractValue: true,
			});
			// One coerce-and-trim gate feeding both branches: the user-target regexes are
			// anchored and do not trim, while the RLC's own By-ID regex tolerates trailing
			// whitespace, so without this a pasted value is accepted on one branch only.
			const value = String(rawValue ?? '').trim();
			const tenantId =
				typeof rows[n].tenantId === 'string' ? (rows[n].tenantId as string).trim() : '';
			// A collection option default only materialises once the option is added, so a
			// hand-edited or AI-authored row can omit `role` entirely, and `roles: [undefined]`
			// is a 400. Not allow-listed against owner/guest: Graph's 400 says it better.
			const role =
				typeof rows[n].role === 'string' && (rows[n].role as string).trim() !== ''
					? (rows[n].role as string).trim()
					: 'owner';

			let id: string;
			if (tenantId !== '') {
				// A row carrying a tenant ID is an out-of-tenant user who is not in the caller's
				// directory, so `GET /users/{id}` would 404 on exactly the case the field serves.
				validateUserTargetId(value, node, userTargetMessages(label));
				id = value;
			} else {
				const user = await resolveUserTarget.call(this, value, i, label);
				id = user.id as string;
			}

			const key = id.toLowerCase();
			// The caller is added below, so a row naming them is dropped. Two rows naming the
			// same other person throw instead: silently shrinking the chat gives no signal.
			if (callerKeys.has(key)) continue;
			if (seen.has(key)) {
				throw new NodeOperationError(node, `Two participants are the same person (${label})`, {
					description: 'A person can be in a chat only once. Remove the duplicate participant.',
				});
			}
			seen.add(key);
			others.push({ id, role, ...(tenantId ? { tenantId } : {}) });
		}
	} catch (error) {
		throw stampItemIndexOnError(error, i);
	}

	// Runs for both chat types: `minRequiredFields` is editor-only, and a row that deduped
	// against the caller leaves the list empty at runtime.
	if (others.length === 0) {
		throw new NodeOperationError(node, 'Add at least one other person to the chat', {
			itemIndex: i,
			description:
				'You are added to the chat automatically, so the chat needs at least one other participant. Check that Other Participants is not empty and does not list only you.',
		});
	}
	if (chatType === 'oneOnOne' && others.length > 1) {
		throw new NodeOperationError(node, 'A one-on-one chat needs exactly one other person', {
			itemIndex: i,
			description:
				'You are added automatically. Remove the extra participants, or switch Chat Type to Group.',
		});
	}

	const baseUrl = await getGraphBaseUrl.call(this);

	const toMember = (member: { id: string; role: string; tenantId?: string }) => ({
		'@odata.type': '#microsoft.graph.aadUserConversationMember',
		roles: [member.role],
		// Two escaping layers hold this bind: percent-encode the id for the URL (a B2B guest UPN
		// truncates at its `#` otherwise), then double any quote for the OData literal.
		'user@odata.bind': `${baseUrl}/v1.0/users(${odataStringLiteral(encodeURIComponent(member.id))})`,
		...(member.tenantId ? { tenantId: member.tenantId } : {}),
	});

	const body: IDataObject = {
		chatType,
		members: [toMember({ id: me.id as string, role: callerRole }), ...others.map(toMember)],
	};
	// Graph rejects a topic on a one-on-one chat.
	if (chatType === 'group' && topic) body.topic = topic;

	return await microsoftApiRequest.call(this, 'POST', '/v1.0/chats', body);
}
