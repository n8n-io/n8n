import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, setSafeObjectProperty } from 'n8n-workflow';

import { dataverseApiRequest, type DataverseQuery } from '../GenericFunctions';
import { normalizeEntitySet } from './shared';

/**
 * Lookup (relationship) column handling for write operations.
 *
 * Dataverse rejects a lookup's raw logical name in a create/update body. Writes
 * must go through the single-valued navigation property with the `@odata.bind`
 * annotation, e.g. `"primarycontactid@odata.bind": "/contacts(<guid>)"`. The
 * navigation property name is NOT always the logical name — for multi-table
 * (polymorphic) lookups such as Customer/Owner a single logical name maps to
 * several target-specific navigation properties (`customerid_account`,
 * `customerid_contact`, ...). We therefore resolve the navigation property and
 * target entity set from relationship metadata and rewrite the body key.
 */

/** One writable target of a lookup column. Polymorphic lookups have several. */
export interface LookupCandidate {
	/** Single-valued navigation property to bind (ReferencingEntityNavigationPropertyName). */
	navigationProperty: string;
	/** Referenced table logical name (e.g. `contact`). */
	referencedEntity: string;
	/** Referenced table entity-set name used in the bind path (e.g. `contacts`). */
	targetEntitySet: string;
}

/** Lookup logical name (lower-cased) → its writable navigation-property targets. */
export type LookupFieldMap = Map<string, LookupCandidate[]>;

interface RelationshipRow {
	ReferencingAttribute?: string;
	ReferencingEntityNavigationPropertyName?: string;
	ReferencedEntity?: string;
}

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// `entityset(<key>)` — a full navigation reference the user can paste verbatim.
const ENTITYSET_PATH_PATTERN = /^\/?[a-z][a-z0-9_]*\([^)]+\)$/i;

// Per-execution cache so a Return All / multi-item write resolves the metadata
// for a given table once, not once per item. Keyed by the execution context so
// it clears automatically when the execution is garbage-collected.
const cache = new WeakMap<object, Map<string, Promise<LookupFieldMap>>>();

/**
 * Resolve the lookup columns of `entitySet` to their navigation-property
 * targets, memoized per execution.
 *
 * Cost: up to three metadata requests per table (resolve the logical name, list
 * many-to-one relationships, resolve the referenced tables' entity-set names).
 * The per-execution {@link cache} collapses this to one resolution per table, so
 * a Return All / multi-item write pays it once, not once per item.
 *
 * Failure contract: an *empty result* (the table isn't found, or it has no
 * lookup columns) yields an empty map — callers then send the body unchanged and
 * a genuinely wrong table surfaces its real error at write time. A *failed
 * request* (network / auth / server error) propagates so the item fails loudly
 * instead of silently skipping lookup translation.
 */
export async function resolveLookupFields(
	ctx: IExecuteFunctions,
	credentialType: string,
	entitySet: string,
): Promise<LookupFieldMap> {
	const set = normalizeEntitySet(entitySet);
	let perCtx = cache.get(ctx);
	if (!perCtx) {
		perCtx = new Map();
		cache.set(ctx, perCtx);
	}
	const existing = perCtx.get(set);
	if (existing) return await existing;

	const pending = buildLookupFieldMap(ctx, credentialType, set);
	perCtx.set(set, pending);
	try {
		return await pending;
	} catch (error) {
		// Don't cache a failure — a later item should be able to retry.
		perCtx.delete(set);
		throw error;
	}
}

async function buildLookupFieldMap(
	ctx: IExecuteFunctions,
	credentialType: string,
	entitySet: string,
): Promise<LookupFieldMap> {
	const map: LookupFieldMap = new Map();

	// 1. entity-set (plural) → table LogicalName. An unknown entity set yields no
	// match; degrade to an empty map (the write itself surfaces the real error).
	const logicalName = await resolveLogicalName(ctx, credentialType, entitySet);
	if (!logicalName) return map;

	// 2. Many-to-one relationships — the lookup columns on this table.
	const rels = await dataverseApiRequest(
		ctx,
		'GET',
		`/EntityDefinitions(LogicalName='${logicalName}')/ManyToOneRelationships`,
		{},
		{
			$select: 'ReferencingAttribute,ReferencingEntityNavigationPropertyName,ReferencedEntity',
		},
		{},
		credentialType,
	);
	const rows = (rels.value as RelationshipRow[] | undefined) ?? [];
	if (rows.length === 0) return map;

	// 3. Referenced table logical names → entity-set names, in one batched call.
	const referenced = [
		...new Set(rows.map((row) => row.ReferencedEntity).filter((name): name is string => !!name)),
	];
	const entitySetByLogical = await resolveEntitySets(ctx, credentialType, referenced);

	for (const row of rows) {
		const attribute = row.ReferencingAttribute?.toLowerCase();
		const navigationProperty = row.ReferencingEntityNavigationPropertyName;
		const referencedEntity = row.ReferencedEntity;
		if (!attribute || !navigationProperty || !referencedEntity) continue;
		const targetEntitySet = entitySetByLogical.get(referencedEntity);
		if (!targetEntitySet) continue;
		const candidates = map.get(attribute) ?? [];
		candidates.push({ navigationProperty, referencedEntity, targetEntitySet });
		map.set(attribute, candidates);
	}
	return map;
}

async function resolveLogicalName(
	ctx: IExecuteFunctions,
	credentialType: string,
	entitySet: string,
): Promise<string | undefined> {
	const response = await dataverseApiRequest(
		ctx,
		'GET',
		'/EntityDefinitions',
		{},
		{
			$select: 'LogicalName',
			$filter: `EntitySetName eq '${entitySet.replace(/'/g, "''")}'`,
		},
		{},
		credentialType,
	);
	const value = response.value as Array<{ LogicalName?: string }> | undefined;
	return value?.[0]?.LogicalName;
}

async function resolveEntitySets(
	ctx: IExecuteFunctions,
	credentialType: string,
	logicalNames: string[],
): Promise<Map<string, string>> {
	const result = new Map<string, string>();
	if (logicalNames.length === 0) return result;
	const filter = logicalNames
		.map((name) => `LogicalName eq '${name.replace(/'/g, "''")}'`)
		.join(' or ');
	const response = await dataverseApiRequest(
		ctx,
		'GET',
		'/EntityDefinitions',
		{},
		{ $select: 'LogicalName,EntitySetName', $filter: filter } as DataverseQuery,
		{},
		credentialType,
	);
	const value =
		(response.value as Array<{ LogicalName?: string; EntitySetName?: string }> | undefined) ?? [];
	for (const def of value) {
		if (def.LogicalName && def.EntitySetName) result.set(def.LogicalName, def.EntitySetName);
	}
	return result;
}

/**
 * Rewrite any lookup columns in `body` to their `@odata.bind` navigation-property
 * form. Non-lookup fields and keys that already carry `@odata.bind` are passed
 * through untouched. Throws a {@link NodeOperationError} for values that can't be
 * bound unambiguously (e.g. a bare GUID for a polymorphic lookup).
 */
export function applyLookupBindings(
	ctx: IExecuteFunctions,
	itemIndex: number,
	body: IDataObject,
	lookupFields: LookupFieldMap,
): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(body)) {
		// Advanced users can supply a ready-made bind key; leave it alone.
		if (key.includes('@odata.bind')) {
			setSafeObjectProperty(out, key, value);
			continue;
		}
		const candidates = lookupFields.get(key.toLowerCase());
		if (!candidates || candidates.length === 0) {
			setSafeObjectProperty(out, key, value);
			continue;
		}
		const binding = buildLookupBinding(ctx, itemIndex, key, value, candidates);
		if (binding.disassociate) {
			// Clear the relationship via the single-valued navigation property.
			setSafeObjectProperty(out, binding.navigationProperty, null);
		} else {
			setSafeObjectProperty(out, `${binding.navigationProperty}@odata.bind`, binding.path);
		}
	}
	return out;
}

interface Binding {
	navigationProperty: string;
	path: string;
	disassociate: boolean;
}

function buildLookupBinding(
	ctx: IExecuteFunctions,
	itemIndex: number,
	field: string,
	value: unknown,
	candidates: LookupCandidate[],
): Binding {
	const single = candidates.length === 1 ? candidates[0] : undefined;
	const targets = candidates.map((candidate) => candidate.targetEntitySet).join(', ');

	// null → disassociate. Only unambiguous for a single-target lookup.
	if (value === null) {
		if (!single) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Cannot clear the multi-table lookup "${field}" from a null value — it can point to ${targets}. Clear it via the specific navigation property instead.`,
				{ itemIndex },
			);
		}
		return { navigationProperty: single.navigationProperty, path: '', disassociate: true };
	}

	const raw = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
	if (!raw) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Lookup field "${field}" has an empty value. Provide a record GUID or a "/entityset(id)" reference.`,
			{ itemIndex },
		);
	}

	// Full reference form: "/contacts(<id>)" or "contacts(<id>)".
	if (raw.startsWith('/') || ENTITYSET_PATH_PATTERN.test(raw)) {
		const path = raw.startsWith('/') ? raw : `/${raw}`;
		const targetEntitySet = path.slice(1, path.indexOf('('));
		const match = candidates.find((c) => c.targetEntitySet === targetEntitySet) ?? single;
		if (!match) {
			throw new NodeOperationError(
				ctx.getNode(),
				`The target "${targetEntitySet}" for lookup "${field}" does not match any related table (${targets}).`,
				{ itemIndex },
			);
		}
		return { navigationProperty: match.navigationProperty, path, disassociate: false };
	}

	// Bare GUID form — needs a single, unambiguous target table.
	if (GUID_PATTERN.test(raw)) {
		if (!single) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Lookup "${field}" can point to multiple tables (${targets}). Provide a "/entityset(${raw})" reference so the target table is unambiguous.`,
				{ itemIndex },
			);
		}
		return {
			navigationProperty: single.navigationProperty,
			path: `/${single.targetEntitySet}(${raw})`,
			disassociate: false,
		};
	}

	throw new NodeOperationError(
		ctx.getNode(),
		`Lookup field "${field}" needs a record GUID or a "/entityset(id)" reference, got "${raw}".`,
		{ itemIndex },
	);
}
