import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	stampItemIndexOnError,
	validateUserTargetId,
	type UserTargetMessages,
} from '../../../GenericFunctions';
import { microsoftApiRequest } from '../transport';

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
 * Known Microsoft-side ceiling: a display name containing `&` makes Teams echo a stray `/at&gt;`
 * after the token. Verified on a live tenant 2026-09-02 to be identical whether we send `&` raw
 * or as `&amp;`, and absent for the same endpoint and a name without `&`, so it is a Teams
 * defect we cannot influence from here. The mention still resolves and notifies (`tenantId` is
 * present in the echo). Escaping stays because it is correct HTML and costs nothing.
 */
function escapeMentionText(text: string): string {
	return text.replace(/[&<>]/g, (char) => MENTION_TEXT_ESCAPES[char]);
}

// `row` is the node-generated row number (loop index + 1), never a user-supplied value, so
// these stay static in the sense that matters: they cannot echo the id back.
const mentionMessages = (row: number): UserTargetMessages => ({
	required: {
		message: `No user selected for mention ${row}`,
		description: 'Pick the user from the list, or enter a user ID or email address.',
	},
	dotsOnly: {
		message: `The user for mention ${row} is not valid`,
		description: 'A user ID cannot consist only of dots.',
	},
	invalid: {
		message: `The user for mention ${row} is not valid`,
		description:
			'Enter a plain email address or user ID. Remove any slashes, backslashes, colons, commas, spaces, or encoded characters and try again.',
	},
});

/**
 * Resolves every mention row to a Graph user. Graph stores `mentions[].mentioned.user` verbatim
 * and resolves nothing: a UPN or a well-formed but nonexistent GUID is accepted with a 200 and a
 * mention that notifies nobody. So each row goes through `GET /users/{idOrUpn}` first, which also
 * yields the authoritative display name.
 *
 * Rows are walked in order, one request each: a realistic list is 1-3 entries, and sequential
 * keeps a failing row unambiguous and the resolved array in row order.
 */
export async function resolveMentions(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<Mention[]> {
	const rows = this.getNodeParameter('mentions.mention', itemIndex, []);
	const rowCount = Array.isArray(rows) ? rows.length : 0;
	const node = this.getNode();
	const mentions: Mention[] = [];

	for (let index = 0; index < rowCount; index++) {
		const raw = this.getNodeParameter(`mentions.mention[${index}].userId`, itemIndex, '', {
			extractValue: true,
		});
		// Validate the shape before encoding (`encodeURIComponent` leaves `..` intact) and encode
		// the same trimmed string, since the validator is anchored and callers trim.
		const value = String(raw ?? '').trim();

		let user: IDataObject;
		try {
			validateUserTargetId(value, node, mentionMessages(index + 1));

			user = (await microsoftApiRequest.call(
				this,
				'GET',
				`/v1.0/users/${encodeURIComponent(value)}`,
				{},
				{ $select: 'id,displayName,userPrincipalName' },
			)) as IDataObject;
		} catch (error) {
			if (error instanceof NodeApiError && error.httpCode === '404') {
				throw new NodeOperationError(node, `Could not find the user for mention ${index + 1}`, {
					itemIndex,
					description:
						'Pick the user from the list, or check that the user ID or email address is correct and that the user exists in this Microsoft 365 tenant.',
				});
			}
			// A validation failure and 403 (missing User.Read.All), 429 or 5xx all keep their own
			// message; only the item index is added.
			throw stampItemIndexOnError(error, itemIndex);
		}

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
) {
	if (mentions.length) {
		// A mention in a `text` message is a hard 400 ("Mentions are only allowed in Html messages").
		contentType = 'html';
		message = `${message} ${mentions
			.map((mention, index) => `<at id="${index}">${escapeMentionText(mention.mentionText)}</at>`)
			.join(' ')}`;
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
