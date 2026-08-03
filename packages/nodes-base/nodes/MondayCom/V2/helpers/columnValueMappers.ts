import type { IDataObject } from 'n8n-workflow';

/**
 * Converts friendly per-type inputs into the column_values JSON that the
 * monday API expects. One pure function per column type so each mapping is
 * unit-testable in isolation.
 *
 * Conventions shared by all mappers:
 * - null / undefined / '' clears the column (monday accepts null in
 *   change_multiple_column_values / create_item JSON).
 * - A string that parses as a JSON object is passed through untouched, so
 *   power users can always hand the API its native format.
 */

type Mapper = (value: unknown) => unknown;

function asStringList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String).filter((entry) => entry.trim() !== '');
	return String(value)
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

/** status: label text, or a numeric label index. */
function mapStatus(value: unknown): unknown {
	if (typeof value === 'number') return { index: value };
	const text = String(value).trim();
	return /^\d+$/.test(text) ? { index: Number(text) } : { label: text };
}

/** dropdown: array or comma-separated list of label names. */
function mapDropdown(value: unknown): unknown {
	return { labels: asStringList(value) };
}

/**
 * people: array or comma-separated list of user IDs. Prefix an entry with
 * "team:" to add a team instead of a person (e.g. "12345, team:678").
 */
function mapPeople(value: unknown): unknown {
	const personsAndTeams = asStringList(value).map((entry) => {
		const isTeam = entry.toLowerCase().startsWith('team:');
		const id = isTeam ? entry.slice(5).trim() : entry;
		return { id: Number(id), kind: isTeam ? 'team' : 'person' };
	});
	return { personsAndTeams };
}

/** date: "YYYY-MM-DD", optionally with a time ("T" or space separated). */
function mapDate(value: unknown): unknown {
	const text = String(value).trim();
	const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2})?))?/);
	if (!match) return { date: text };
	const [, date, time] = match;
	if (!time) return { date };
	return { date, time: time.length === 5 ? `${time}:00` : time };
}

/** checkbox: any boolean-ish value; false clears the checkbox. */
function mapCheckbox(value: unknown): unknown {
	const truthy =
		value === true || value === 1 || /^(true|yes|1|checked)$/i.test(String(value).trim());
	return truthy ? { checked: 'true' } : null;
}

/** numbers: the API expects the number serialized as a string. */
function mapNumbers(value: unknown): unknown {
	return String(value);
}

/** rating: 1-5 (or whatever the column allows). */
function mapRating(value: unknown): unknown {
	return { rating: Number(value) };
}

/** timeline: "YYYY-MM-DD/YYYY-MM-DD" (also accepts " to " as separator). */
function mapTimeline(value: unknown): unknown {
	const [from, to] = String(value)
		.split(/\/| to /)
		.map((part) => part.trim());
	return { from, to };
}

/** week: same input shape as timeline, mapped to startDate/endDate. */
function mapWeek(value: unknown): unknown {
	const [startDate, endDate] = String(value)
		.split(/\/| to /)
		.map((part) => part.trim());
	return { week: { startDate, endDate } };
}

/** link: "https://url" or "https://url Display text". */
function mapLink(value: unknown): unknown {
	const text = String(value).trim();
	const spaceIndex = text.indexOf(' ');
	if (spaceIndex === -1) return { url: text, text };
	return { url: text.slice(0, spaceIndex), text: text.slice(spaceIndex + 1).trim() };
}

/** email: "user@x.com" or "user@x.com Display text". */
function mapEmail(value: unknown): unknown {
	const text = String(value).trim();
	const spaceIndex = text.indexOf(' ');
	if (spaceIndex === -1) return { email: text, text };
	return { email: text.slice(0, spaceIndex), text: text.slice(spaceIndex + 1).trim() };
}

/** phone: "+15551234567" or "+15551234567 US" (ISO-2 country code). */
function mapPhone(value: unknown): unknown {
	const parts = String(value).trim().split(/\s+/);
	const phone = parts[0];
	const country = parts[1]?.toUpperCase();
	return country ? { phone, countryShortName: country } : { phone };
}

/** location: "lat,lng" or "lat,lng,address text". */
function mapLocation(value: unknown): unknown {
	const [lat, lng, ...addressParts] = String(value).split(',');
	const result: IDataObject = { lat: lat?.trim(), lng: lng?.trim() };
	if (addressParts.length > 0) result.address = addressParts.join(',').trim();
	return result;
}

/** hour: "HH:MM" (24h). */
function mapHour(value: unknown): unknown {
	const [hour, minute] = String(value).split(':');
	return { hour: Number(hour), minute: Number(minute ?? 0) };
}

/** country: ISO-2 code, e.g. "US". */
function mapCountry(value: unknown): unknown {
	const code = String(value).trim().toUpperCase();
	return { countryCode: code };
}

/** long_text: plain text body. */
function mapLongText(value: unknown): unknown {
	return { text: String(value) };
}

/** text: a plain string, sent as-is. */
function mapText(value: unknown): unknown {
	return String(value);
}

/** board_relation / dependency: array or CSV of linked item IDs. */
function mapItemIds(value: unknown): unknown {
	return { item_ids: asStringList(value).map(Number) };
}

/** tags: array or CSV of tag IDs. */
function mapTags(value: unknown): unknown {
	return { tag_ids: asStringList(value).map(Number) };
}

const MAPPERS: Record<string, Mapper> = {
	board_relation: mapItemIds,
	checkbox: mapCheckbox,
	country: mapCountry,
	date: mapDate,
	dependency: mapItemIds,
	dropdown: mapDropdown,
	email: mapEmail,
	hour: mapHour,
	link: mapLink,
	location: mapLocation,
	long_text: mapLongText,
	numbers: mapNumbers,
	people: mapPeople,
	phone: mapPhone,
	rating: mapRating,
	status: mapStatus,
	tags: mapTags,
	text: mapText,
	timeline: mapTimeline,
	week: mapWeek,
};

/** Column types the API cannot write to; excluded from the mapper UI. */
export const READ_ONLY_COLUMN_TYPES = new Set([
	'auto_number',
	'button',
	'creation_log',
	'file',
	'formula',
	'item_id',
	'last_updated',
	'lookup',
	'mirror',
	'progress',
	'subtasks',
	'time_tracking',
	'vote',
]);

/**
 * Converts one friendly value into the API JSON for the given column type.
 * Unknown types pass objects through untouched and send anything else as a
 * plain string — the raw-JSON escape hatch for types without a mapper.
 */
export function mapColumnValue(columnType: string, value: unknown): unknown {
	if (value === null || value === undefined || value === '') return null;

	// A JSON-object string is the API's native format; pass it through.
	if (typeof value === 'string' && value.trim().startsWith('{')) {
		try {
			return JSON.parse(value);
		} catch {
			// Not valid JSON after all — fall through to the typed mapper.
		}
	}
	// Objects (e.g. from expressions) are assumed to be API-format already.
	if (typeof value === 'object' && !Array.isArray(value)) return value;

	const mapper = MAPPERS[columnType];
	return mapper ? mapper(value) : String(value);
}

/**
 * Builds the full column_values object for create_item /
 * change_multiple_column_values from mapper output and the board's
 * column-type index. Columns without a known type are treated as text.
 */
export function buildColumnValues(
	values: Record<string, unknown>,
	columnTypes: Record<string, string>,
): IDataObject {
	const result: IDataObject = {};
	for (const [columnId, value] of Object.entries(values)) {
		result[columnId] = mapColumnValue(columnTypes[columnId] ?? 'text', value) as never;
	}
	return result;
}
