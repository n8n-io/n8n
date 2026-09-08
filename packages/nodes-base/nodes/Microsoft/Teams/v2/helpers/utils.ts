import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeListSearchItems,
} from 'n8n-workflow';
import { isResourceLocatorValue, NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	stampItemIndexOnError,
	validateUserTargetId,
	type UserTargetMessages,
} from '../../../GenericFunctions';
import { buildTeamsPath, microsoftApiRequest } from '../transport';

/** Where the `<at>` tokens go relative to the message text. The workflow-link footer, when on,
 * always comes last, so `end` means "after the text, before the footer". */
export type MentionPlacement = 'start' | 'end';

export type Mention = {
	mentionText: string;
	mentioned:
		| { user: { id: string; displayName: string; userIdentityType: 'aadUser' } }
		| { tag: { id: string; displayName: string } };
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
 * Rewrites Graph's 403 for a missing team-tag scope into copy that names the n8n action. Returns
 * `undefined` for every other error, so both tag call sites stay one line and the two
 * descriptions cannot drift apart.
 *
 * The text has to be read from all three fields. The delegated transport branch in
 * `utils/microsoft/transport.ts` passes `errorOptions.message`, which puts Graph's text in
 * `.message` and clears `.description`; a `NodeApiError` built from a raw response body leaves it
 * in `.description` and `.messages`. Gating on one field alone is green in tests and dead in
 * production.
 */
export function tagPermissionError(
	error: unknown,
	node: INode,
	message: string,
	itemIndex?: number,
): NodeOperationError | undefined {
	if (!(error instanceof NodeApiError) || error.httpCode !== '403') return undefined;
	if (![error.message, error.description, ...error.messages].join(' ').includes('TeamworkTag')) {
		return undefined;
	}

	return new NodeOperationError(node, message, {
		itemIndex,
		description:
			"This credential does not have permission to read team tags. Add TeamworkTag.Read to the credential's scopes if you set them yourself, then open the credential and select Reconnect. A Microsoft Entra admin must approve it.",
	});
}

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
 * Reads a row field that may hold a resource-locator object. Keyed on key presence, not on
 * truthiness: the everyday "row added, nobody picked yet" state is the RLC default
 * `{ __rl: true, mode: 'list', value: '' }`, and unwrapping it on truthiness would pass the whole
 * object down and tell the user to remove slashes from an ID they never typed. One deliberate
 * delta from `extractValue`: `isResourceLocatorValue` also requires `__rl`, which `extractValueRLC`
 * does not, so a hand-authored `{ mode, value }` without it is stricter here than under the
 * indexed read this replaced. That shape then lands on the object branch below, like
 * `resolveMailbox` in `Microsoft/Outlook/v2/transport`: collapsing it reports "nothing selected"
 * with no request, where stringifying it would send the literal `[object Object]` to Graph and
 * spend a call to learn nothing. A number or a boolean still stringifies, because only an object
 * is guaranteed useless as an ID.
 */
const rlcValue = (value: unknown): string => {
	const raw = isResourceLocatorValue(value) ? value.value : value;
	if (typeof raw === 'string') return raw.trim();
	return typeof raw === 'number' || typeof raw === 'boolean' ? String(raw) : '';
};

/**
 * Looks a team tag up under the team that owns it. A foreign tag ID 404s under
 * `/teams/{other}/tags/{id}`, which is how team ownership is proven.
 */
async function resolveTagMention(
	this: IExecuteFunctions,
	tagId: string,
	teamId: string,
	rowNumber: number,
	itemIndex: number,
): Promise<Mention> {
	const node = this.getNode();
	let tag: IDataObject;

	try {
		// `buildTeamsPath`, not `encodeURIComponent`: a tag ID is base64 over `[A-Za-z0-9=]` only
		// (see `teamworkTagRLC`), which needs no encoding, and Graph's own docs interpolate it
		// raw. The user branch encodes only because a B2B guest UPN carries `#EXT#`, which
		// `buildTeamsPath` rejects. It is built inside this try so the catch below attributes a
		// malformed ID to its item.
		const response = (await microsoftApiRequest.call(
			this,
			'GET',
			buildTeamsPath.call(this, ['/v1.0/teams/', { id: teamId }, '/tags/', { id: tagId }]),
		)) as IDataObject;
		// The v1.0 get-by-id docs example wraps the entity in `value` while the list endpoint
		// returns an array under the same key. Drop the fallback once the ENT-350 live spike
		// settles it.
		tag = (response.value ?? response) as IDataObject;
	} catch (error) {
		// Only a tag row rewrites its 403. A user row in the same loop keeps Graph's own message,
		// by ENT-324's choice.
		const denied = tagPermissionError(error, node, 'Could not read the team tag', itemIndex);
		if (denied) throw denied;
		if (error instanceof NodeApiError && error.httpCode === '404') {
			throw new NodeOperationError(node, `Could not find the team tag for mention ${rowNumber}`, {
				itemIndex,
				description:
					'Pick the tag from the list, or check that the tag ID is correct and that the tag belongs to the selected team.',
			});
		}
		throw stampItemIndexOnError(error, itemIndex);
	}

	// No fallback for either field, unlike the user branch below. A tag ID is an opaque base64
	// blob, so falling back to it ships a garbage chip that Graph still accepts; and if the
	// response is the list shape, both fields are missing, `mentioned.tag.id` drops out of the
	// body and the run is green with a mention that notifies nobody.
	if (
		typeof tag.id !== 'string' ||
		!tag.id ||
		typeof tag.displayName !== 'string' ||
		!tag.displayName
	) {
		throw new NodeOperationError(node, `Could not read the team tag for mention ${rowNumber}`, {
			itemIndex,
			description: 'Microsoft Graph returned a tag without an ID or a display name.',
		});
	}

	// The ID comes from the response, never from the input: `validateMicrosoftGraphId` trims and
	// percent-decodes, so the path can legitimately differ from what the user typed, and the body
	// is what decides who gets notified.
	return {
		mentionText: tag.displayName,
		mentioned: { tag: { id: tag.id, displayName: tag.displayName } },
	};
}

/**
 * One Graph lookup per distinct mention target for the whole run, not one per item. The router
 * calls `resolveMentions` once per input item with the same execute context, so a static mention
 * on a 500-item fan-out would otherwise repeat the same lookup 500 times, sequentially. Keyed on
 * the context object, so the cache is collected with the execution and never crosses runs or
 * tenants. Only successes are stored, so a throttled row is retried on the next item.
 *
 * Keys are namespaced by mention type, and a tag key carries its team: the same ID string means
 * different things in the two arms, and a tag only resolves under the team that owns it.
 */
const resolvedPerRun = new WeakMap<IExecuteFunctions, Map<string, Mention>>();

/**
 * Resolves every mention row to a Graph user or team tag. Graph stores `mentions[].mentioned`
 * verbatim and resolves nothing: a UPN, a well-formed but nonexistent GUID or a bogus tag ID is
 * accepted with a 200 and a mention that notifies nobody. So each row is looked up first, which
 * also yields the authoritative display name.
 *
 * Rows are walked in order, one request each: a realistic list is 1-3 entries, and sequential
 * keeps a failing row unambiguous and the resolved array in row order.
 */
export async function resolveMentions(
	this: IExecuteFunctions,
	itemIndex: number,
	teamId?: string,
): Promise<Mention[]> {
	// Read the rows wholesale. An indexed read with `{ extractValue: true }` throws once a row
	// field carries a `displayOptions`, which the mention type discriminator gives both pickers.
	const raw = this.getNodeParameter('mentions.mention', itemIndex, []);
	const rows: IDataObject[] = Array.isArray(raw) ? (raw as IDataObject[]) : [];
	const node = this.getNode();
	const mentions: Mention[] = [];

	let cache = resolvedPerRun.get(this);
	if (!cache) {
		cache = new Map<string, Mention>();
		resolvedPerRun.set(this, cache);
	}

	for (let index = 0; index < rows.length; index++) {
		// A null or non-object row used to fall through lodash `get` to the read's fallback.
		const row: IDataObject = rows[index] ?? {};
		const { mentionType } = row;

		if (mentionType === 'tag') {
			const tagId = rlcValue(row.tagId);
			if (!tagId) {
				throw new NodeOperationError(node, `No team tag selected for mention ${index + 1}`, {
					itemIndex,
					description: 'Pick the tag from the list, or enter a tag ID.',
				});
			}
			// `undefined` is a chat message, which has no team and no tag picker; `''` is a
			// channel message whose Team field is empty.
			if (teamId === undefined) {
				throw new NodeOperationError(node, 'Team tags are not available in a chat message', {
					itemIndex,
					description: `Remove mention ${index + 1} or use a channel message.`,
				});
			}
			if (!teamId) {
				throw new NodeOperationError(
					node,
					`No team selected for the team tag in mention ${index + 1}`,
					{ itemIndex, description: 'Select the team that owns the tag and try again.' },
				);
			}

			const tagKey = `tag:${teamId}\u0000${tagId}`;
			const cachedTag = cache.get(tagKey);
			if (cachedTag) {
				// Safe to share by reference: `prepareMessage` spreads rather than mutates.
				mentions.push(cachedTag);
				continue;
			}

			const tagMention = await resolveTagMention.call(this, tagId, teamId, index + 1, itemIndex);
			cache.set(tagKey, tagMention);
			mentions.push(tagMention);
			continue;
		}

		// `undefined` is what `chatMessage:create` always sends: its row declares only `userRLC`,
		// so there is no discriminator to read. An unknown value is an error rather than a silent
		// user mention, because it reaches here from imported JSON, the public API and a
		// surviving `$fromAI()` expression.
		if (mentionType !== undefined && mentionType !== 'user') {
			throw new NodeOperationError(node, `The mention type for mention ${index + 1} is not valid`, {
				itemIndex,
				description: 'Set the mention type to either User or Team Tag.',
			});
		}

		// Validate the shape before encoding (`encodeURIComponent` leaves `..` intact) and encode
		// the same trimmed string, since the validator is anchored and callers trim.
		const value = rlcValue(row.userId);

		const userKey = `user:${value}`;
		const cached = cache.get(userKey);
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
		cache.set(userKey, mention);
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
