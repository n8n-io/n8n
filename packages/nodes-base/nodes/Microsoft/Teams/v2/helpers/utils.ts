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

/** Where the `<at>` tokens go relative to the message text. The workflow-link footer, when on,
 * always comes last, so `end` means "after the text, before the footer". */
export type MentionPlacement = 'start' | 'end';

export type Mention = {
	mentionText: string;
	mentioned: { user: { id: string; displayName: string; userIdentityType: 'aadUser' } };
};

/**
 * Escapes the marker text. A B2B guest's display name is third-party input, and an unescaped
 * angle bracket breaks the token. NOT `escapeHtml` from `utils/utilities.ts`: that one decodes.
 *
 * Apply this to the `<at>` inner text AND to `mentions[].mentionText`, so the two are the same
 * string. Graph matches the marker leniently (either form is accepted) but then uses
 * `mentionText.length` to find where the token ends. Feeding it the raw name while the body
 * holds the escaped one makes it resume that many characters early and duplicate the tail of
 * `</at>` into the message, which renders as a stray `/at>` after the chip. Same length on both
 * sides, no drift.
 */
function escapeMentionText(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
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
 * `GET /users/{id}` resolves an object id or a principal name, never a `mail` address, and the
 * two differ for every guest. So a 404 on something that looks like an address gets one more try
 * against `mail` before we give up, which keeps By Email agreeing with From List, whose `$search`
 * already matches on mail.
 */
async function findUserByMail(
	this: IExecuteFunctions,
	address: string,
): Promise<IDataObject | undefined> {
	// OData string literals escape a single quote by doubling it.
	const literal = address.replace(/'/g, "''");
	const response = (await microsoftApiRequest.call(
		this,
		'GET',
		'/v1.0/users',
		{},
		{ $filter: `mail eq '${literal}'`, $select: 'id,displayName,userPrincipalName', $top: 2 },
	)) as IDataObject;
	const found = Array.isArray(response.value) ? (response.value as IDataObject[]) : [];
	// Exactly one match only: an ambiguous address should fall through to the not-found error
	// rather than silently mentioning the wrong person.
	return found.length === 1 ? found[0] : undefined;
}

/**
 * One Graph lookup per distinct user for the whole run, not one per item. The router calls
 * `resolveMentions` once per input item with the same execute context, so a static mention on a
 * 500-item fan-out would otherwise repeat the same `GET /users/{id}` 500 times, sequentially.
 * Keyed on the context object, so the cache is collected with the execution and never crosses
 * runs or tenants. Only successes are stored, so a throttled row is retried on the next item.
 */
const resolvedPerRun = new WeakMap<IExecuteFunctions, Map<string, Mention>>();

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

	let cache = resolvedPerRun.get(this);
	if (!cache) {
		cache = new Map<string, Mention>();
		resolvedPerRun.set(this, cache);
	}

	for (let index = 0; index < rowCount; index++) {
		const raw = this.getNodeParameter(`mentions.mention[${index}].userId`, itemIndex, '', {
			extractValue: true,
		});
		// Validate the shape before encoding (`encodeURIComponent` leaves `..` intact) and encode
		// the same trimmed string, since the validator is anchored and callers trim.
		const value = String(raw ?? '').trim();

		const cached = cache.get(value);
		if (cached) {
			// Safe to share by reference: `prepareMessage` spreads rather than mutates.
			mentions.push(cached);
			continue;
		}

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
				// Only an address can be a `mail` value, so a GUID goes straight to the error.
				// The fallback runs inside this catch, so its own 403/429/5xx would otherwise
				// escape without the row index the primary lookup stamps on.
				const byMail = value.includes('@')
					? await findUserByMail.call(this, value).catch((mailError) => {
							throw stampItemIndexOnError(mailError, itemIndex);
						})
					: undefined;
				if (!byMail) {
					throw new NodeOperationError(node, `Could not find the user for mention ${index + 1}`, {
						itemIndex,
						description:
							'Pick the user from the list, or check that the user ID or email address is correct and that the user exists in this Microsoft 365 tenant.',
					});
				}
				user = byMail;
			} else {
				// A validation failure and 403 (missing User.Read.All), 429 or 5xx all keep their
				// own message; only the item index is added.
				throw stampItemIndexOnError(error, itemIndex);
			}
		}

		// Directory objects with no display name exist (some guests, some service accounts);
		// without a fallback the mention renders as a blank chip. `||`, so `''` falls through.
		const label =
			(user.displayName as string) || (user.userPrincipalName as string) || (user.id as string);

		const mention: Mention = {
			mentionText: label,
			mentioned: {
				user: { id: user.id as string, displayName: label, userIdentityType: 'aadUser' },
			},
		};
		cache.set(value, mention);
		mentions.push(mention);
	}

	return mentions;
}

export function prepareMessage(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	message: string,
	contentType: string,
	includeLinkToWorkflow: boolean,
	instanceId?: string,
	// Read-only on purpose. `resolveMentions` caches these per run, so the same object can arrive
	// for several items and mutating one here would corrupt every later item in the run.
	mentions: readonly Mention[] = [],
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
		body.mentions = mentions.map((mention, index) => ({
			...mention,
			id: index,
			// Must be byte-identical to the token's inner text; see `escapeMentionText`.
			mentionText: escapeMentionText(mention.mentionText),
		}));
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
