import { isRecord } from '@n8n/utils/is-record';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyCollection,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { isSet } from './meetingSettings';
import { userRLC } from '../../descriptions';
import { resolveUserTarget, rlcValue } from '../../helpers/utils';
import { rewriteForbiddenUnderSp } from '../../transport';

const ROLE_DESCRIPTION =
	'Presenter takes effect only when Allowed Presenters is set to Specific People';
const CREATE_OR_GET_NOTE = 'Applies only when a new meeting is created.';
const UPDATE_NOTE = 'Replaces the current attendees. An empty list removes them all.';

const roleField: INodeProperties = {
	displayName: 'Role',
	name: 'role',
	type: 'options',
	default: 'attendee',
	options: [
		{ name: 'Attendee', value: 'attendee' },
		{ name: 'Presenter', value: 'presenter' },
	],
	description: ROLE_DESCRIPTION,
};

// The collection UI does not render a fixedCollection's own description, so the note is repeated
// on the row fields, which always show.
const rowsWithNote = (note: string, withRole = true): INodePropertyCollection[] => [
	{
		displayName: 'Attendee',
		name: 'attendee',
		values: [
			{ ...userRLC, description: [userRLC.description, note].join(' ') },
			...(withRole ? [{ ...roleField, description: `${ROLE_DESCRIPTION}. ${note}` }] : []),
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
	description: 'The people to invite to the meeting',
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
	description: `The people to invite. ${CREATE_OR_GET_NOTE}`,
	// No role: the createOrGet body has no Allowed Presenters, so a Presenter row could not take effect.
	options: rowsWithNote(CREATE_OR_GET_NOTE, false),
};

/** Update: inside Update Fields. */
export const updateAttendeesField: INodeProperties = {
	...attendeesField,
	description: UPDATE_NOTE,
	options: rowsWithNote(UPDATE_NOTE),
};

export type MeetingAttendee = {
	identity: { user: { id: string } };
	upn?: string;
	role: 'attendee' | 'presenter';
};

const isRole = (value: unknown): value is MeetingAttendee['role'] =>
	value === 'attendee' || value === 'presenter';

// Module-private on purpose: tests assert the literal, so a silent rewording fails them.
const FORBIDDEN_MESSAGE = 'Resolving attendees needs the User.Read.All application permission';
const FORBIDDEN_DESCRIPTION =
	'Grant it to the app registration with admin consent. The node looks every attendee up to get the ID and the principal name.';

// One lookup per distinct value for the whole run, like `resolvedPerRun` in the helpers: keyed
// on the execute context, successes only, so a throttled row is retried on the next item.
const attendeesPerRun = new WeakMap<IExecuteFunctions, Map<string, { id: string; upn?: string }>>();

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
	// `field` is the whole fixedCollection value, `{}` or `{ attendee: rows }` from the editor. Any
	// other container shape (a string, a bare list, an unknown key, rows that are not a list) can
	// only come from the API, imported JSON or an expression. It is rejected before any request
	// instead of being read as an empty list, which on Update would clear the roster.
	if (!isSet(field)) return [];
	if (
		!isRecord(field) ||
		Object.keys(field).some((key) => key !== 'attendee') ||
		(field.attendee !== undefined && !Array.isArray(field.attendee))
	) {
		throw new NodeOperationError(node, 'The Attendees field is not valid', {
			itemIndex,
			description: 'Attendees must be a list of rows.',
		});
	}
	const rows: IDataObject[] = Array.isArray(field.attendee)
		? (field.attendee as IDataObject[])
		: [];

	// Every role is checked before the first request, so a bad role on any row costs no lookup.
	// Only a missing key defaults; `null`, `''` and unknown strings are rejected.
	const roles: Array<MeetingAttendee['role']> = [];
	for (let index = 0; index < rows.length; index++) {
		const row: IDataObject = rows[index] ?? {};
		const { role = 'attendee' } = row;
		if (!isRole(role)) {
			throw new NodeOperationError(node, `The role for attendee ${index + 1} is not valid`, {
				itemIndex,
				description: 'Set the role to either Attendee or Presenter.',
			});
		}
		roles.push(role);
	}

	let cache = attendeesPerRun.get(this);
	if (!cache) {
		cache = new Map();
		attendeesPerRun.set(this, cache);
	}

	// Insertion order keeps the first row's position.
	const byId = new Map<string, MeetingAttendee>();
	for (let index = 0; index < rows.length; index++) {
		const row: IDataObject = rows[index] ?? {};
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
			user = typeof upn === 'string' && upn ? { id: found.id, upn } : { id: found.id };
			cache.set(value, user);
		}

		const existing = byId.get(user.id);
		if (existing) {
			if (roles[index] === 'presenter') existing.role = 'presenter';
			continue;
		}
		byId.set(user.id, {
			identity: { user: { id: user.id } },
			...(user.upn ? { upn: user.upn } : {}),
			role: roles[index],
		});
	}

	return [...byId.values()];
}
