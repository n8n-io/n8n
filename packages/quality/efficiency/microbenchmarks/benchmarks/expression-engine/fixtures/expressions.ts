/**
 * Expression fixtures organized by access pattern.
 * Patterns and distribution based on analysis of 9,035 production workflows
 * (78,517 expression occurrences).
 */

/** Simple single-property access — 26.3% of real usage */
export const SIMPLE_PROPERTY = [
	'={{ $json.id }}',
	'={{ $json.name }}',
	'={{ $json.email }}',
	'={{ $json.status }}',
] as const;

/** Nested property access (2-3 levels) — 11.2% of real usage */
export const NESTED_PROPERTY = [
	'={{ $json.nested.user.profile.age }}',
	'={{ $json.nested.user.profile.displayName }}',
] as const;

/** Extension function calls — 4.4% of real usage */
export const EXTENSION_CALL = [
	'={{ $json.name.toUpperCase() }}',
	'={{ $json.name.isEmpty() }}',
] as const;

/** Array iteration with arrow functions — 2.2% of real usage */
export const ARRAY_ITERATION = [
	'={{ $json.items.map(i => i.id) }}',
	'={{ $json.items.filter(i => i.active) }}',
	'={{ $json.items.filter(i => i.active).map(i => i.id) }}',
] as const;

/** Conditional / nullish coalescing — 5.6% of real usage */
export const CONDITIONAL = [
	'={{ $json.email ?? "none" }}',
	'={{ $json.status === "active" ? "yes" : "no" }}',
] as const;

/** All groups for iteration */
export const ALL_GROUPS = {
	'Simple Property': SIMPLE_PROPERTY,
	'Nested Property': NESTED_PROPERTY,
	'Extension Call': EXTENSION_CALL,
	'Array Iteration': ARRAY_ITERATION,
	Conditional: CONDITIONAL,
} as const;
