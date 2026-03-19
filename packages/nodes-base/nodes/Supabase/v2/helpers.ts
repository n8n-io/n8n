import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const MANAGEMENT_API_BASE = 'https://api.supabase.com';

/** Full-text search function names keyed by PostgREST operator */
const FTS_FUNCTIONS: Record<string, string> = {
	fts: 'to_tsquery',
	plfts: 'plainto_tsquery',
	phfts: 'phraseto_tsquery',
	wfts: 'websearch_to_tsquery',
};

/** Valid literals for the IS condition */
const IS_LITERALS = new Set(['null', 'true', 'false', 'unknown']);

/**
 * Validate a SQL identifier and wrap it in double-quotes.
 * Only allows: letters, digits, underscores, and dollar signs, starting with a letter or underscore.
 * Throws NodeOperationError on invalid input to prevent SQL injection via identifiers.
 */
export function quoteIdentifier(name: string, node: INode): string {
	if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name)) {
		throw new NodeOperationError(
			node,
			`Invalid SQL identifier: "${name}". Identifiers may only contain letters, digits, underscores, and dollar signs, and must start with a letter or underscore.`,
		);
	}
	return `"${name}"`;
}

/**
 * Build a schema-qualified table reference, e.g. "public"."my_table".
 */
export function buildTableRef(schema: string, table: string, node: INode): string {
	return `${quoteIdentifier(schema, node)}.${quoteIdentifier(table, node)}`;
}

export interface WhereClauseResult {
	clause: string;
	params: unknown[];
}

/**
 * Build a parameterized SQL WHERE clause from filter conditions.
 * All user-supplied values are placed in the params array ($n placeholders).
 * Column names are validated and quoted to prevent injection.
 *
 * @param conditions   Array of condition objects from the filter UI
 * @param matchType    'allFilters' (AND) or 'anyFilter' (OR)
 * @param startIndex   The $n index to start from (1-based)
 * @param node         INode for error reporting
 */
export function buildWhereClause(
	conditions: IDataObject[],
	matchType: string,
	startIndex: number,
	node: INode,
): WhereClauseResult {
	const parts: string[] = [];
	const params: unknown[] = [];
	let paramIndex = startIndex;

	for (const condition of conditions) {
		const colName = condition.keyName as string;
		const conditionType = condition.condition as string;
		const keyValue = condition.keyValue as string;
		const quotedCol = quoteIdentifier(colName, node);

		if (conditionType === 'is') {
			// IS condition: value must be a whitelisted literal (no parameter)
			const literal = (keyValue ?? '').toLowerCase().trim();
			if (!IS_LITERALS.has(literal)) {
				throw new NodeOperationError(
					node,
					`Invalid value "${keyValue}" for IS condition. Must be one of: null, true, false, unknown.`,
				);
			}
			parts.push(`${quotedCol} IS ${literal.toUpperCase()}`);
		} else if (conditionType in FTS_FUNCTIONS) {
			// Full-text search: "col" @@ ts_function($n)
			const fn = FTS_FUNCTIONS[conditionType];
			params.push(keyValue);
			parts.push(`${quotedCol} @@ ${fn}($${paramIndex})`);
			paramIndex++;
		} else if (conditionType === 'fullText') {
			// Fallback: use the searchFunction sub-field if present
			const searchFunction = (condition.searchFunction as string) ?? 'fts';
			const fn = FTS_FUNCTIONS[searchFunction] ?? 'to_tsquery';
			params.push(keyValue);
			parts.push(`${quotedCol} @@ ${fn}($${paramIndex})`);
			paramIndex++;
		} else {
			// Standard comparison operators
			const opMap: Record<string, string> = {
				eq: '=',
				neq: '<>',
				gt: '>',
				gte: '>=',
				lt: '<',
				lte: '<=',
				like: 'LIKE',
				ilike: 'ILIKE',
			};
			const op = opMap[conditionType];
			if (!op) {
				throw new NodeOperationError(node, `Unknown filter condition: "${conditionType}"`);
			}

			let value: unknown = keyValue;
			// Replace PostgREST wildcard (*) with SQL wildcard (%) for LIKE/ILIKE
			if (conditionType === 'like' || conditionType === 'ilike') {
				value = (keyValue ?? '').replace(/\*/g, '%');
			}

			params.push(value);
			parts.push(`${quotedCol} ${op} $${paramIndex}`);
			paramIndex++;
		}
	}

	const joiner = matchType === 'allFilters' ? ' AND ' : ' OR ';
	return { clause: parts.join(joiner), params };
}

/**
 * Execute a SQL query against the Supabase Management API.
 * Uses parameterized queries to prevent SQL injection on values.
 *
 * @returns The rows from the result array.
 */
export async function managementApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	projectRef: string,
	credentialType: string,
	query: string,
	parameters: unknown[] = [],
): Promise<IDataObject[]> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${MANAGEMENT_API_BASE}/v1/projects/${projectRef}/database/query`,
		body: {
			query,
			...(parameters.length > 0 ? { parameters } : {}),
		},
		json: true,
	};

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			credentialType,
			options,
		);
		// Management API returns { result: [...] }
		const rows = (response as IDataObject).result;
		if (!Array.isArray(rows)) {
			return [];
		}
		return rows as IDataObject[];
	} catch (error) {
		if ((error as IDataObject).description) {
			(error as IDataObject).message =
				`${(error as IDataObject).message}: ${(error as IDataObject).description}`;
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Retrieve the project reference and credential type from the active credential.
 */
export async function getProjectCredentials(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	authentication: string,
): Promise<{ projectRef: string; credentialType: string }> {
	if (authentication === 'oAuth2') {
		const credentials = await context.getCredentials<{ projectRef: string }>(
			'supabaseManagementOAuth2Api',
		);
		return { projectRef: credentials.projectRef, credentialType: 'supabaseManagementOAuth2Api' };
	}
	const credentials = await context.getCredentials<{ projectRef: string }>('supabaseManagementApi');
	return { projectRef: credentials.projectRef, credentialType: 'supabaseManagementApi' };
}
