import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { odataStringLiteral } from '@utils/microsoft/odata';

import {
	stampItemIndexOnError,
	validateUserTargetId,
	type UserTargetMessages,
} from '../../../GenericFunctions';
import { microsoftApiRequest } from '../transport';

/** Where the `<at>` tokens go relative to the message text. The workflow-link footer, when on,
 * always comes last, so `end` means "after the text, before the footer". */
export type MentionPlacement = 'start' | 'end';

export type Mention = {
	mentionText: string;
	mentioned: { user: { id: string; displayName: string; userIdentityType: 'aadUser' } };
};

const MENTION_TEXT_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
};

/**
 * Escapes the `<at>` inner text. A B2B guest's display name is set in their home tenant, so it is
 * third-party input, and an unescaped angle bracket breaks the token, which Graph answers with a
 * 400 or a silently stripped mention. NOT `escapeHtml` from `utils/utilities.ts`: that one decodes.
 *
 * Graph validates the `<at>` inner text against `mentions[].mentionText` and 400s on a mismatch
 * ("Neither Body nor adaptive card content contains marker for mention with Id '0'"), so the two
 * cannot be decoupled. It compares them DECODED: the error quotes the raw display name while the
 * escaped form is accepted, which is why escaping here is safe. Live-verified 2026-09-02.
 *
 * Known Microsoft-side ceiling: a display name containing `&` makes Teams render a stray `/at>`
 * after the mention chip. Verified byte-identical whether we send `&` raw, as `&amp;` or as
 * `&#38;`, and absent on the same endpoint for a name without `&`, so it is a Teams defect we
 * cannot influence from here. The mention still resolves and notifies (`tenantId` present in the
 * echo). Escaping stays because it is correct HTML and costs nothing.
 */
function escapeMentionText(text: string): string {
	return text.replace(/[&<>]/g, (char) => MENTION_TEXT_ESCAPES[char]);
}

// `label` is a node-generated row label (e.g. `mention 2`, `participant 1`), never a
// user-supplied value. Callers must never pass an id or any parameter value: these messages
// are surfaced verbatim and must not echo input back.
export const userTargetMessages = (label: string): UserTargetMessages => ({
	required: {
		message: `No user selected for ${label}`,
		description: 'Pick the user from the list, or enter a user ID or email address.',
	},
	dotsOnly: {
		message: `The user for ${label} is not valid`,
		description: 'A user ID cannot consist only of dots.',
	},
	invalid: {
		message: `The user for ${label} is not valid`,
		description:
			'Enter a plain email address or user ID. Remove any slashes, backslashes, colons, commas, spaces, or encoded characters and try again.',
	},
});

/**
 * `GET /users/{id}` resolves an object id or a principal name, never a `mail` address, and the two
 * differ for every guest (27 of 137 users on the QA tenant). So a 404 on something that looks like
 * an address gets one more try against `mail` before we give up, which keeps By Email agreeing
 * with From List, whose `$search` already matches on mail. Live-verified 2026-09-03.
 */
async function findUsersByMail(this: IExecuteFunctions, address: string): Promise<IDataObject[]> {
	const response = (await microsoftApiRequest.call(
		this,
		'GET',
		'/v1.0/users',
		{},
		{
			$filter: `mail eq ${odataStringLiteral(address)}`,
			$select: 'id,displayName,userPrincipalName',
			$top: 2,
		},
	)) as IDataObject;
	// The matches, not a single winner: the caller has to tell an ambiguous address apart from
	// an unknown one, because "the user does not exist" is the wrong answer for two matches.
	return Array.isArray(response.value) ? (response.value as IDataObject[]) : [];
}

/**
 * Resolves one user-picker row to the Graph user it names. Graph stores
 * `mentions[].mentioned.user` verbatim and resolves nothing: a UPN or a well-formed but
 * nonexistent GUID is accepted with a 200 and a mention that notifies nobody. So each row goes
 * through `GET /users/{idOrUpn}` first, which also yields the authoritative display name.
 *
 * `label` names the row in every error (`mention 2`, `participant 1`) and must never carry a
 * parameter value. Shared by the mention rows and by `chat:create`'s participant rows.
 */
export async function resolveUserTarget(
	this: IExecuteFunctions,
	raw: unknown,
	itemIndex: number,
	label: string,
): Promise<IDataObject> {
	const node = this.getNode();
	// Validate the shape before encoding (`encodeURIComponent` leaves `..` intact) and encode
	// the same trimmed string, since the validator is anchored and callers trim.
	const value = String(raw ?? '').trim();

	try {
		validateUserTargetId(value, node, userTargetMessages(label));

		return (await microsoftApiRequest.call(
			this,
			'GET',
			`/v1.0/users/${encodeURIComponent(value)}`,
			{},
			{ $select: 'id,displayName,userPrincipalName' },
		)) as IDataObject;
	} catch (error) {
		if (!(error instanceof NodeApiError && error.httpCode === '404')) {
			// A validation failure and 403 (missing User.Read.All), 429 or 5xx all keep their
			// own message; only the item index is added.
			throw stampItemIndexOnError(error, itemIndex);
		}
		// Only an address can be a `mail` value, so a GUID goes straight to the error.
		const matches = value.includes('@')
			? await findUsersByMail.call(this, value).catch((mailError) => {
					throw stampItemIndexOnError(mailError, itemIndex);
				})
			: [];
		if (matches.length > 1) {
			throw new NodeOperationError(node, `More than one user has that email address for ${label}`, {
				itemIndex,
				description:
					'Two or more users in this Microsoft 365 tenant share that email address. Pick the user from the list, or enter their user ID instead.',
			});
		}
		if (matches.length === 0) {
			throw new NodeOperationError(node, `Could not find the user for ${label}`, {
				itemIndex,
				description:
					'Pick the user from the list, or check that the user ID or email address is correct and that the user exists in this Microsoft 365 tenant.',
			});
		}
		return matches[0];
	}
}

/** Rows are walked in order, one request each: sequential keeps a failing row unambiguous. */
export async function resolveMentions(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<Mention[]> {
	const rows = this.getNodeParameter('mentions.mention', itemIndex, []);
	const rowCount = Array.isArray(rows) ? rows.length : 0;
	const mentions: Mention[] = [];

	for (let index = 0; index < rowCount; index++) {
		const raw = this.getNodeParameter(`mentions.mention[${index}].userId`, itemIndex, '', {
			extractValue: true,
		});
		const user = await resolveUserTarget.call(this, raw, itemIndex, `mention ${index + 1}`);

		// Directory objects with no display name exist (some guests, some service accounts);
		// without a fallback the mention renders as a blank chip. `||`, so `''` falls through.
		const label =
			(user.displayName as string) || (user.userPrincipalName as string) || (user.id as string);

		mentions.push({
			mentionText: label,
			mentioned: {
				user: { id: user.id as string, displayName: label, userIdentityType: 'aadUser' },
			},
		});
	}

	return mentions;
}

export function prepareMessage(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	message: string,
	contentType: string,
	includeLinkToWorkflow: boolean,
	instanceId?: string,
	mentions: Mention[] = [],
	mentionPlacement: MentionPlacement = 'start',
) {
	if (mentions.length) {
		// A mention in a `text` message is a hard 400 ("Mentions are only allowed in Html messages").
		contentType = 'html';
		const tokens = mentions
			.map((mention, index) => `<at id="${index}">${escapeMentionText(mention.mentionText)}</at>`)
			.join(' ');
		// The footer is appended after this, so tokens stay above it either way.
		const parts = mentionPlacement === 'end' ? [message, tokens] : [tokens, message];
		message = parts.filter(Boolean).join(' ');
	}

	if (includeLinkToWorkflow) {
		const { id } = this.getWorkflow();
		const link = `${this.getInstanceBaseUrl()}workflow/${id}?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=${encodeURIComponent(
			'n8n-nodes-base.microsoftTeams',
		)}${instanceId ? '_' + instanceId : ''}`;
		contentType = 'html';
		message = `${message}<br><br><em> Powered by <a href="${link}">this n8n workflow</a> </em>`;
	}

	const body: IDataObject = {
		body: {
			contentType,
			content: message,
		},
	};

	// `id` comes from the same index as the token above. Graph 400s on any mismatch between the
	// two, which is the invariant this function exists to hold.
	if (mentions.length) {
		body.mentions = mentions.map((mention, index) => ({ ...mention, id: index }));
	}

	return body;
}

export function filterSortSearchListItems(items: INodeListSearchItems[], filter?: string) {
	return items
		.filter(
			(item) =>
				!filter ||
				item.name.toLowerCase().includes(filter.toLowerCase()) ||
				item.value.toString().toLowerCase().includes(filter.toLowerCase()),
		)
		.sort((a, b) => {
			if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
				return -1;
			}
			if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
				return 1;
			}
			return 0;
		});
}
