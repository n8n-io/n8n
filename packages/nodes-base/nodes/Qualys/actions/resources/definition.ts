/**
 * The vocabulary every resource folder speaks.
 *
 * An operation is a data record, not code: it names the endpoint, how the
 * response is shaped, and which UI parameters it shows. The router and the
 * parameter builder both read these fields instead of branching on the resource
 * name, which is what keeps the menus and the requests from drifting apart.
 *
 * Endpoint versions in the resource tables are pinned to the only ones Qualys
 * still marks Active. Host List and Host List Detection 2.0-4.0 reached
 * End-of-Support in December 2025; the KnowledgeBase, Report and Dynamic Search
 * List APIs have each since moved a version on.
 */
import type { QualysOperationKind, QualysPlane } from '../types';

export type OperationDefinition = {
	/** Menu entry. Operation values are globally unique, so `displayOptions` can key on them alone. */
	name: string;
	/** Shown in n8n's action picker; distinct per operation. */
	action: string;
	description: string;
	/** What the router does with the response. */
	kind: QualysOperationKind;

	plane: QualysPlane;
	endpoint: string;
	method: 'GET' | 'POST';
	/** Dotted path to the record array in the parsed response. */
	recordPath?: string;
	/** Response is XML rather than JSON. */
	xml?: boolean;
	/** `action=list` and friends, required on the platform plane. */
	apiAction?: string;
	/**
	 * Response is an object keyed by identifier rather than a record array. The
	 * key is injected into each record under this name.
	 */
	keyedRecords?: string;
	/** Endpoints that answer 404 or 204 when the account holds no records. */
	emptyOn404?: boolean;
	/**
	 * Asset Management cursor paging. The request parameter and the response field
	 * are NOT the same name on every endpoint.
	 */
	cursor?: { requestParam: string; responseField: string };
	pageSize?: { default: number; max: number };
	/** Which filter document the endpoint expects. */
	filterShape?: 'assetCriteria' | 'componentFilter';
	/** Node property holding this operation's Additional Fields collection, if it has one. */
	optionsProperty?: string;
	/** Batch size is controlled by `truncation_limit`. */
	truncatable?: boolean;
	/**
	 * The endpoint has no paging of its own: it answers a query in one response,
	 * however large that gets. A full pull is therefore walked in windows of
	 * record id (`id_min`/`id_max`) so each response stays inside what Node can
	 * hold in a string.
	 */
	idWindowed?: boolean;
	/** The record id goes in the path rather than the query string. */
	idInPath?: boolean;
};

export type ResourceDefinition = {
	name: string;
	description: string;
	operations: Record<string, OperationDefinition>;
};

/** A list operation, which is nearly all of them: `GET` returning a record array. */
export const list = (
	over: Omit<OperationDefinition, 'kind' | 'method'> & { method?: 'GET' | 'POST' },
) => ({ kind: 'list', method: 'GET', ...over }) as OperationDefinition;
