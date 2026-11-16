/**
 * Merges the output schemas that telemetry recorded for one node operation
 * into a single `__schema__` file. Each sample comes from a different
 * workflow, so a key that only some workflows have is user data (a form
 * field, a sheet column) and is dropped. Follows the rules of
 * `schema-harvest`: no `required`, and null widens to unknown.
 */

/** A UUID or a long hex digest names a record, not a field. */
const OPAQUE_KEY =
	/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32,})$/i;

/** Every concrete type a schema allows, reading `anyOf` as a union. */
function typesOf(schema) {
	if (Array.isArray(schema.anyOf)) return schema.anyOf.flatMap(typesOf);
	if (schema.type === undefined) return [];
	return [schema.type].flat();
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
		properties[key] = mergeSchemaList(values, minShare);
	}
	return properties;
}

function mergeSchemaList(schemas, minShare) {
	const types = [...new Set(schemas.flatMap(typesOf))].filter((t) => t !== 'null').sort();
	if (types.length === 0) return {};
	if (types.length > 1) return { type: types };

	const [type] = types;
	if (type === 'object') {
		const properties = mergeProperties(membersOfType(schemas, type), minShare);
		// No shared keys means user-defined keys: describe an open object, not an empty one.
		return Object.keys(properties).length ? { type, properties } : { type };
	}
	if (type === 'array') {
		const items = membersOfType(schemas, type)
			.map((s) => s.items)
			.filter(Boolean);
		return { type, items: items.length ? mergeSchemaList(items, minShare) : {} };
	}
	return { type };
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

/** Deterministic, sorted, tab-indented JSON — the format Biome applies on commit. */
export function stringifySchema(schema) {
	const sortKeys = (_key, value) =>
		value && typeof value === 'object' && !Array.isArray(value)
			? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
			: value;
	return JSON.stringify(schema, sortKeys, '\t') + '\n';
}
