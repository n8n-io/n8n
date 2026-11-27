/**
 * The resource registry.
 *
 * Resources are the UI grouping - what the data is - and each owns its own
 * folder. The transport grouping is different: several resources share a Qualys
 * API plane, and that machinery lives in `../planes`.
 */
import type { QualysResource } from '../types';
import type { OperationDefinition, ResourceDefinition } from './definition';
import { easmResource } from './easm';
import { itAssetResource } from './itAsset';
import { otResource } from './ot';
import { vmdrResource } from './vmdr';

export type { OperationDefinition, ResourceDefinition } from './definition';

export const RESOURCES: Record<QualysResource, ResourceDefinition> = {
	ot: otResource,
	itAsset: itAssetResource,
	vmdr: vmdrResource,
	easm: easmResource,
};

/** An operation definition that knows its own name and which resource owns it. */
export type Operation = OperationDefinition & {
	operation: string;
	resource: QualysResource;
};

/** Every operation, flattened, so the UI and router can look one up directly. */
export const OPERATIONS: Record<string, Operation> = Object.fromEntries(
	Object.entries(RESOURCES).flatMap(([resource, definition]) =>
		Object.entries(definition.operations).map(([operation, spec]) => [
			operation,
			{ ...spec, operation, resource: resource as QualysResource },
		]),
	),
);

/** Operation values matching a predicate, for building `displayOptions`. */
export const operationsWhere = (
	predicate: (operation: OperationDefinition) => boolean | undefined,
): string[] => Object.keys(OPERATIONS).filter((name) => Boolean(predicate(OPERATIONS[name])));

export const CSAM_PAGE_SIZE_MAX = 300;
export const CSAM_PAGE_SIZE_HARD_MAX = 1000;
export const OT_PAGE_SIZE = 100;
export const FO_DEFAULT_TRUNCATION = 1000;

/**
 * Walking an unpaged endpoint by record id.
 *
 * The window is a span of ids, not a record count: Qualys answers with whatever
 * falls inside it. 10,000 QIDs of full KnowledgeBase detail is tens of
 * megabytes, comfortably under the ~512 MB string Node can build, and covers
 * the whole QID space in around a hundred calls.
 *
 * Ids are sparse, so an empty window means nothing on its own - the gap between
 * QID 13,000 and QID 38,000 is real data-free space. The walk therefore only
 * stops once a run of windows comes back empty, or once it passes the ceiling.
 */
export const FO_ID_WINDOW_SIZE = 10_000;
export const FO_ID_WINDOW_CEILING = 1_000_000;
export const FO_ID_WINDOW_EMPTY_RUN = 10;
