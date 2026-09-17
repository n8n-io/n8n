import { isRecord } from '@n8n/utils/is-record';
import type { IExecuteFunctions, INodeProperties, INodePropertyCollection } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { isSet } from './shared';
import { userRLC } from '../../descriptions';
import { resolveUserTarget, rlcValue } from '../../helpers/utils';
import { rewriteForbiddenUnderSp } from '../../transport';

const INVITE = 'The people to invite to the meeting';
const CREATE_OR_GET_NOTE =
	'Attendees apply only when a new meeting is created. The node still looks up every attendee on every run.';
const UPDATE_NOTE = 'The Attendees list replaces the current attendees.';

const roleField: INodeProperties = {
	displayName: 'Role',
	name: 'role',
	type: 'options',
	default: 'attendee',
	options: [
		{ name: 'Attendee', value: 'attendee' },
		{ name: 'Presenter', value: 'presenter' },
	],
	description: 'Presenter takes effect only when Allowed Presenters is set to Specific People',
};

// The collection-overhaul UI renders only the title of a fixedCollection, not its description, so
// the note is repeated on the row fields, which show in both UIs.
const rowsWithNote = (note: string, withRole = true): INodePropertyCollection[] => [
	{
		displayName: 'Attendee',
		name: 'attendee',
		values: [
			{ ...userRLC, description: [userRLC.description, note].join(' ') },
			...(withRole
				? [{ ...roleField, description: [roleField.description, note].join('. ') }]
				: []),
		],
	},
];

/** Create: top level, after End Time. */
export const attendeesField: INodeProperties = {
	displayName: 'Attendees',
	name: 'attendees',
	type: 'fixedCollection',
	placeholder: 'Add Attendee',
	default: {},
	typeOptions: {
		multipleValues: true,
		sortable: true,
	},
	description: INVITE,
	options: [
		{
			displayName: 'Attendee',
			name: 'attendee',
			values: [userRLC, roleField],
		},
	],
};

/** Create or Get: inside Options. Graph ignores the body when the meeting already exists. */
export const createOrGetAttendeesField: INodeProperties = {
	...attendeesField,
	description: `${INVITE}. ${CREATE_OR_GET_NOTE}`,
	// No role: the createOrGet body has no Allowed Presenters, so a Presenter row could not take effect.
	options: rowsWithNote(CREATE_OR_GET_NOTE, false),
};

/**
 * Update: inside Update Fields. An empty list clears the attendees, but the two editor UIs save an
 * emptied list differently (one drops it, one keeps it), so the copy does not promise the clear.
 */
export const updateAttendeesField: INodeProperties = {
	...attendeesField,
	description: `${INVITE}. ${UPDATE_NOTE}`,
	options: rowsWithNote(UPDATE_NOTE),
};

type MeetingAttendee = {
	identity: { user: { id: string } };
	upn?: string;
	role: 'attendee' | 'presenter';
};

const isRole = (value: unknown): value is MeetingAttendee['role'] =>
	value === 'attendee' || value === 'presenter';

// `{}` or `{ attendee: rows }`, the two shapes the editor stores. Anything else (a string, a bare
// list, an unknown key, `null` rows, rows that are not objects) can only come from the API,
// imported JSON or an expression. The spread copy matters: `every` skips the holes of a sparse list.
const isAttendeeRows = (value: unknown): value is { attendee?: Array<Record<string, unknown>> } =>
	isRecord(value) &&
	Object.keys(value).every((key) => key === 'attendee') &&
	(value.attendee === undefined ||
		(Array.isArray(value.attendee) && [...value.attendee].every(isRecord)));

const FORBIDDEN_MESSAGE = 'Resolving attendees needs the User.Read.All application permission';
const FORBIDDEN_DESCRIPTION =
	'Grant it to the app registration with admin consent. The node looks every attendee up to get the ID and the principal name.';

// One lookup per distinct value for the whole run, like `resolvedPerRun` in the helpers: keyed
// on the execute context, successes only, so a throttled row is retried on the next item.
const attendeesPerRun = new WeakMap<
	IExecuteFunctions,
	Map<string, Omit<MeetingAttendee, 'role'>>
>();

/**
 * Resolves the Attendees rows to Graph `meetingParticipantInfo` entries. Graph stores
 * `participants.attendees[].identity.user.id` verbatim, so every row is looked up first.
 * Two rows for the same person collapse into the first one, and Presenter wins.
 */
export async function resolveAttendees(
	this: IExecuteFunctions,
	itemIndex: number,
	field: unknown,
): Promise<MeetingAttendee[]> {
	const node = this.getNode();
	// An unknown shape is rejected before any request instead of being read as an empty list,
	// which on Update would clear the roster.
	if (!isSet(field)) return [];
	if (!isAttendeeRows(field)) {
		throw new NodeOperationError(node, 'The Attendees field is not valid', {
			itemIndex,
			description: 'Attendees must be a list of rows.',
		});
	}
	const rows = field.attendee ?? [];

	// Every role is checked before the first request, so a bad role on any row costs no lookup.
	// Only a missing key defaults; `null`, `''` and unknown strings are rejected.
	const roles = rows.map(({ role = 'attendee' }, index) => {
		if (isRole(role)) return role;
		throw new NodeOperationError(node, `The role for attendee ${index + 1} is not valid`, {
			itemIndex,
			description: 'Set the role to either Attendee or Presenter.',
		});
	});

	let cache = attendeesPerRun.get(this);
	if (!cache) {
		cache = new Map();
		attendeesPerRun.set(this, cache);
	}

	// Insertion order keeps the first row's position.
	const byId = new Map<string, MeetingAttendee>();
	for (const [index, row] of rows.entries()) {
		const value = rlcValue(row.userId);
		let user = cache.get(value);
		if (!user) {
			// Every attendee mode is looked up, so under SP even a GUID needs the permission. No-op
			// for a delegated credential and for every status but 403; the router stamps itemIndex.
			const found = await resolveUserTarget
				.call(this, value, itemIndex, `attendee ${index + 1}`)
				.catch((error: unknown) => {
					throw rewriteForbiddenUnderSp.call(this, error, FORBIDDEN_MESSAGE, FORBIDDEN_DESCRIPTION);
				});
			const upn = found.userPrincipalName;
			// Omit the key rather than send an empty string when Graph returns no principal name.
			user = {
				identity: { user: { id: found.id } },
				...(typeof upn === 'string' && upn ? { upn } : {}),
			};
			cache.set(value, user);
		}

		const id = user.identity.user.id;
		const existing = byId.get(id);
		if (existing) {
			if (roles[index] === 'presenter') existing.role = 'presenter';
			continue;
		}
		// A copy, so a later promotion to Presenter never touches the cached entry.
		byId.set(id, { ...user, role: roles[index] });
	}

	return [...byId.values()];
}
