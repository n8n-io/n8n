/**
 * Merges the output schemas that telemetry recorded for one node operation
 * into a single `__schema__` file. Each sample comes from a different
 * workflow, so a key that only some workflows have is user data (a form
 * field, a sheet column) and is dropped. An object that keeps some keys
 * while samples add their own stays open (`additionalProperties: true`).
 * Like `schema-harvest`, it never emits `required`, and a key that is only
 * ever null widens to unknown.
 */

/** A UUID, a long hex digest or a plain number names a record, not a field. */
const OPAQUE_KEY =
	/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32,}|\d+)$/i;

/** Properties whose keys the user or the account defines; only the container is knowable. */
const OPAQUE_PROPERTIES = new Set(['metadata', 'custom_fields']);

/** An opaque bag keeps its type and stays an open object, without keys. */
function opaqueBag(schema) {
	return schema.type === undefined ? schema : { type: schema.type };
}

/** Below this share of stable keys, samples add user-defined keys to an object. */
const MIN_STABLE_KEY_SHARE = 0.8;

/**
 * Every concrete type a schema allows, reading `anyOf` as a union. An integer
 * reads as a number: a sample cannot prove that a value is never fractional.
 */
function typesOf(schema) {
	if (Array.isArray(schema.anyOf)) return schema.anyOf.flatMap(typesOf);
	if (schema.type === undefined) return [];
	return [schema.type].flat().map((t) => (t === 'integer' ? 'number' : t));
}

function membersOfType(schemas, type) {
	return schemas
		.flatMap((s) => (Array.isArray(s.anyOf) ? s.anyOf : [s]))
		.filter((s) => typesOf(s).includes(type));
}

function mergeProperties(objects, minShare) {
	const keys = [...new Set(objects.flatMap((o) => Object.keys(o.properties ?? {})))].sort();
	const properties = {};
	for (const key of keys) {
		if (OPAQUE_KEY.test(key)) continue;
		const values = objects.map((o) => o.properties?.[key]).filter(Boolean);
		if (values.length / objects.length < minShare) continue;
		const merged = mergeSchemaList(values, minShare);
		properties[key] = OPAQUE_PROPERTIES.has(key) ? opaqueBag(merged) : merged;
	}
	return properties;
}

/** Properties of the object members, open when samples have keys that the merge drops. */
function mergeObjectShape(objects, minShare) {
	const properties = mergeProperties(objects, minShare);
	if (Object.keys(properties).length === 0) return {};
	// A key that some samples have but the merge dropped still exists in real output.
	const droppedKeys = objects.some((o) =>
		Object.keys(o.properties ?? {}).some((k) => !(k in properties)),
	);
	const open = droppedKeys || stableKeyShare(objects) < MIN_STABLE_KEY_SHARE;
	return open ? { properties, additionalProperties: true } : { properties };
}

function mergeArrayItems(arrays, minShare) {
	const items = arrays.map((s) => s.items).filter(Boolean);
	return { items: items.length ? mergeSchemaList(items, minShare) : {} };
}

function mergeSchemaList(schemas, minShare) {
	const types = [...new Set(schemas.flatMap(typesOf))].sort();
	const realTypes = types.filter((t) => t !== 'null');
	if (realTypes.length === 0) return {};

	return {
		type: types.length === 1 ? types[0] : types,
		...(realTypes.includes('object')
			? mergeObjectShape(membersOfType(schemas, 'object'), minShare)
			: {}),
		...(realTypes.includes('array')
			? mergeArrayItems(membersOfType(schemas, 'array'), minShare)
			: {}),
	};
}

/**
 * @param {object[]} samples one JSON schema per workflow
 * @param {{ minShare?: number }} [options] share of samples a key needs to be kept
 */
export function mergeSamples(samples, { minShare = 0.5 } = {}) {
	return mergeSchemaList(samples, minShare);
}

/**
 * Average share of each sample's top-level keys that at least `recurringShare`
 * of all samples have. User-defined keys (form fields, sheet columns, custom
 * fields) each recur in few workflows, so a low share marks user-shaped
 * output. An optional built-in key, set by a node option, recurs often enough
 * to count as stable.
 */
export function stableKeyShare(samples, { recurringShare = 0.25 } = {}) {
	const keySets = samples
		.map((s) => Object.keys(s.properties ?? {}))
		.filter((keys) => keys.length > 0);
	if (keySets.length === 0) return 1;

	const counts = new Map();
	for (const key of keySets.flat()) counts.set(key, (counts.get(key) ?? 0) + 1);
	const isStable = (key) => counts.get(key) / keySets.length >= recurringShare;
	const shares = keySets.map((keys) => keys.filter(isStable).length / keys.length);
	return shares.reduce((a, b) => a + b, 0) / shares.length;
}

/** The object schemas inside a property or array item of each sample. */
function childObjects(samples, key) {
	return samples
		.map((s) => s.properties?.[key])
		.flatMap((child) => (child?.type === 'array' ? [child.items] : [child]))
		.filter((child) => child && typeof child === 'object' && child.properties);
}

/**
 * Whether every key of every sample recurs in at least `recurringShare` of the
 * samples, at every level. A key that only one sample has, even deep inside a
 * nested object, marks user data.
 */
export function keysAgree(samples, { recurringShare = 0.5 } = {}) {
	if (stableKeyShare(samples, { recurringShare }) < 1) return false;
	const keys = new Set(samples.flatMap((s) => Object.keys(s.properties ?? {})));
	return [...keys].every((key) => {
		const children = childObjects(samples, key);
		return children.length < 2 || keysAgree(children, { recurringShare });
	});
}

/** Deterministic, sorted, tab-indented JSON — the format Biome applies on commit. */
export function stringifySchema(schema) {
	const sortKeys = (_key, value) =>
		value && typeof value === 'object' && !Array.isArray(value)
			? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
			: value;
	return JSON.stringify(schema, sortKeys, '\t') + '\n';
}
