import { escapeRegExp, mapValues, isEqual } from 'lodash';

import { OperationalError } from './errors';
import type { INode, INodeParameters, NodeParameterValueType } from './Interfaces';

export function hasDotNotationBannedChar(nodeName: string) {
	const DOT_NOTATION_BANNED_CHARS = /^(\d)|[\\ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~]/g;

	return DOT_NOTATION_BANNED_CHARS.test(nodeName);
}

export function backslashEscape(nodeName: string) {
	const BACKSLASH_ESCAPABLE_CHARS = /[.*+?^${}()|[\]\\]/g;

	return nodeName.replace(BACKSLASH_ESCAPABLE_CHARS, (char) => `\\${char}`);
}

export function dollarEscape(nodeName: string) {
	return nodeName.replace(new RegExp('\\$', 'g'), '$$$$');
}

type AccessPattern = {
	checkPattern: string;
	replacePattern: (name: string) => string;
	customCallback?: (expression: string, newName: string, escapedNewName: string) => string;
};

const ACCESS_PATTERNS: AccessPattern[] = [
	{
		checkPattern: '$(',
		replacePattern: (s) => String.raw`(\$\(['"])${s}(['"]\))`,
	},
	{
		checkPattern: '$node[',
		replacePattern: (s) => String.raw`(\$node\[['"])${s}(['"]\])`,
	},
	{
		checkPattern: '$node.',
		replacePattern: (s) => String.raw`(\$node\.)${s}(\.?)`,
		customCallback: (expression: string, newName: string, escapedNewName: string) => {
			if (hasDotNotationBannedChar(newName)) {
				const regex = new RegExp(`.${backslashEscape(newName)}( |\\.)`, 'g');
				return expression.replace(regex, `["${escapedNewName}"]$1`);
			}
			return expression;
		},
	},
	{
		checkPattern: '$items(',
		replacePattern: (s) => String.raw`(\$items\(['"])${s}(['"],|['"]\))`,
	},
];

export function applyAccessPatterns(expression: string, previousName: string, newName: string) {
	// To not run the "expensive" regex stuff when it is not needed
	// make a simple check first if it really contains the node-name
	if (!expression.includes(previousName)) return expression;

	// Really contains node-name (even though we do not know yet if really as $node-expression)
	const escapedOldName = backslashEscape(previousName); // for match
	const escapedNewName = dollarEscape(newName); // for replacement

	for (const pattern of ACCESS_PATTERNS) {
		if (expression.includes(pattern.checkPattern)) {
			expression = expression.replace(
				new RegExp(pattern.replacePattern(escapedOldName), 'g'),
				`$1${escapedNewName}$2`,
			);

			if (pattern.customCallback) {
				expression = pattern.customCallback(expression, newName, escapedNewName);
			}
		}
	}
	return expression;
}

type ExpressionMapping = {
	nodeNameInExpression: string; // 'abc';
	originalExpression: string; // "$('abc').first().def.ghi";
	replacementPrefix: string; //  "$('Start').first()";
	replacementName: string; // "def_ghi";
};

const DOT_REFERENCEABLE_JS_VARIABLE = /\w[\w\d_\$]*/;
const INVALID_JS_DOT_PATH = /[^\.\w\d_\$]/;
const INVALID_JS_DOT_NAME = /[^\w\d_\$]/;

// These are the keys that are followed by one of DATA_ACCESSORS
const ITEM_TO_DATA_ACCESSORS = [
	/^first\(\)/,
	/^last\(\)/,
	/^all/,
	// The order here is relevant because `item` would match occurrences of `itemMatching`
	/^itemMatching\(\d+\)/, // We only support trivial itemMatching arguments
	/^item/,
];

// These we safely can convert to a normal argument
const ITEM_ACCESSORS = ['params', 'isExecuted'];

const DATA_ACCESSORS = ['json', 'binary'];

function convertToUniqueJsDotName(nodeName: string, allNodeNames: string[]) {
	let jsLegal = nodeName
		.replaceAll(' ', '_')
		.split('')
		.filter((x) => !INVALID_JS_DOT_NAME.test(x))
		.join('');

	if (nodeName === jsLegal) return jsLegal;

	// This accounts for theoretical cases where we collide with other reduced names
	// By adding our own index in the array we also avoid running into theoretical cases
	// where a node with the name 'ourName_27' exists for our reduced name 'ourName'
	// because we must have a different index, so therefore only one of us can be `ourName_27_27`
	//
	// The underscore prevents colliding e.g. index 1 with 11
	while (allNodeNames.includes(jsLegal)) jsLegal += `_${allNodeNames.indexOf(nodeName)}`;
	return jsLegal;
}

function convertDataAccessorName(name: string): string {
	const [fnName, maybeDigits] = name.split('(');
	if (fnName !== 'itemMatching') return fnName;

	// use the digits without the )
	return `${fnName}_${maybeDigits?.slice(0, -1) ?? 'invalid'}`;
}

// Grow the selection as long as we follow a simple path structure:
// - $('myName').a.b.c => from first dot to entire expression
// - $('myName').a.b['c'] => from first dot to b
export function parseExpressionMapping(
	isolatedExpression: string,
	nodeNameInExpression: string,
	nodeNamePlainJs: string,
	startNodeName: string,
): ExpressionMapping | null {
	const splitExpr = isolatedExpression.split('.');

	// This supports . used in the node name
	const dotsInName = nodeNameInExpression.split('').filter((x) => x === '.').length;
	const exprStart = splitExpr.slice(0, dotsInName + 1).join('.');
	const parts = splitExpr.slice(dotsInName + 1);

	if (parts.length === 0) {
		// If a node is referenced by name without any accessor we return a proxy that stringifies as an empty object
		// But it can still be validly passed to other functions
		// However when passed to a sub-workflow it collapses into a true empty object
		// So lets just abort porting this and don't touch it
		return null;
	}

	if (ITEM_TO_DATA_ACCESSORS.some((x) => parts[0].match(x))) {
		if (parts.length === 1) {
			// this case is a literal use of the return value of `$('nodeName').first()`
			// Note that it's safe to rename to first, even if there is a variable of the same name
			// since we resolve duplicate names later in the process
			const originalName = parts[0];
			return {
				nodeNameInExpression,
				originalExpression: `${exprStart}.${parts[0]}`, // $('abc').first()
				replacementPrefix: `$('${startNodeName}').${parts[0]}`, //  $('Start').first()
				replacementName: `${nodeNamePlainJs}_${convertDataAccessorName(originalName)}`, // nodeName_first, nodeName_itemMatching_20
			};
		} else {
			if (DATA_ACCESSORS.some((x) => parts[1] === x)) {
				let partsIdx = 2;
				for (; partsIdx < parts.length; ++partsIdx) {
					if (!DOT_REFERENCEABLE_JS_VARIABLE.test(parts[partsIdx])) break;
				}
				// Use a separate name for anything except item
				// The alternative is to differentiate accessors later on to deduplicate names
				// Which would first add the nodeName and then `_1` until unique
				const replacementPostfix =
					parts[0] === 'item' ? '' : `_${convertDataAccessorName(parts[0])}`;
				return {
					nodeNameInExpression,
					originalExpression: `${exprStart}.${parts.slice(0, partsIdx + 1).join('.')}`, // $('abc').item.json.valid.until, but not ['x'] after
					replacementPrefix: `$('${startNodeName}').${parts[0]}.${parts[1]}`, // $('Start').item.json
					replacementName: parts.slice(2, partsIdx).join('_') + replacementPostfix, // valid_until, or valid_until_first
				};
			} else {
				// this case covers any normal ObjectExtensions functions called on the ITEM_TO_DATA_ACCESSORS entry
				// e.g. $('nodeName').first().toJsonObject().randomJSFunction()
				return {
					nodeNameInExpression,
					originalExpression: `${exprStart}.${parts[0]}`, // $('abc').first()
					replacementPrefix: `$('${startNodeName}').${parts[0]}.json`, //  $('Start').first().json.
					replacementName: `${nodeNamePlainJs}_${parts[0].split('(')[0]}`, // nodeName_first
				};
			}
		}
	}

	const itemAccessorMatch = ITEM_ACCESSORS.flatMap((x) => (x === parts[0] ? x : []))[0];
	if (itemAccessorMatch !== undefined) {
		return {
			nodeNameInExpression,
			originalExpression: `${exprStart}.${parts[0]}`, // $('abc').isExecuted
			replacementPrefix: `$('${startNodeName}').${parts[0]}`, //  $('Start').isExecuted
			replacementName: `${nodeNamePlainJs}_${parts[0]}`, // nodeName_isExecuted
		};
	}

	// If we end up here it means that:
	// - we have a complex `itemMatching(<expr>)` case, or
	// - the expression should be invalid, or
	// - a new function was added that we're not aware of.
	//
	// In these cases let's just not touch it and keep it as is
	return null;
}

export function parseMatch(
	match: RegExpExecArray,
	expression: string,
	nodeNames: string[],
	startNodeName: string,
): ExpressionMapping | null {
	const startIndex = match.index;
	const endIndex = startIndex + match[0].length + 1;
	// this works because all access patterns define match groups left and right of the name
	// [fullMatch, group1, group2, group3]
	const nodeNameInExpression = match[2];

	if (!nodeNames.includes(nodeNameInExpression)) return null;

	const firstPartException = ITEM_TO_DATA_ACCESSORS.map((x) =>
		x.exec(expression.slice(endIndex)),
	).filter((x) => x !== null);

	// Note that by choosing match 0 we prefer `itemMatching` over `item` for occurrences of itemMatching
	const after_accessor_idx = endIndex + (firstPartException[0]?.[0].length ?? -1) + 1;
	const after_accessor = expression.slice(after_accessor_idx);
	const firstInvalidCharMatch = INVALID_JS_DOT_PATH.exec(after_accessor);
	// we should always find the }} closing the JS expressions, if nothing else
	if (!firstInvalidCharMatch) return null;

	const candidate = expression.slice(startIndex, after_accessor_idx + firstInvalidCharMatch.index);
	const data = parseExpressionMapping(
		candidate,
		nodeNameInExpression,
		convertToUniqueJsDotName(nodeNameInExpression, nodeNames),
		startNodeName,
	);

	if (data !== null) return { ...data, nodeNameInExpression };
	else return null;
}

export function buildExtractWorkflowExpressionDataMap(
	expression: string,
	nodeRegexps: Array<readonly [string, LazyRegExp]>,
	nodeNames: string[],
	startNodeName: string,
): ExpressionMapping[] {
	const result: ExpressionMapping[] = [];

	for (const [pattern, regexp] of nodeRegexps) {
		if (!expression.includes(pattern)) continue;

		const matches = [...expression.matchAll(regexp.get())];
		result.push(
			...matches
				.map((x) => parseMatch(x, expression, nodeNames, startNodeName))
				.filter((x) => x !== null),
		);
	}

	return result;
}

class LazyRegExp {
	private regExp?: RegExp;

	constructor(
		private pattern: () => string,
		private flags?: string,
	) {}

	get(): RegExp {
		if (!this.regExp) this.regExp = new RegExp(this.pattern(), this.flags);

		return this.regExp;
	}
}

type ParameterMapping<T> = undefined | T[] | { [key: PropertyKey]: ParameterMapping<T> };

type ParameterExtractMapping = ParameterMapping<ExpressionMapping>;

function applyParameterMapping(
	parameterValue: NodeParameterValueType,
	mapper: (s: string) => ExpressionMapping[],
	keyOfValue?: string,
): [ParameterExtractMapping, ExpressionMapping[]] {
	const result: ParameterExtractMapping = {};

	if (typeof parameterValue !== 'object' || parameterValue === null) {
		if (
			typeof parameterValue === 'string' &&
			(parameterValue.charAt(0) === '=' || keyOfValue === 'jsCode')
		) {
			const mapping = mapper(parameterValue);
			return [mapping, mapping];
		}
		return [undefined, []];
	}

	const allMappings = [];
	for (const [key, value] of Object.entries(parameterValue)) {
		const [mapping, all] = applyParameterMapping(value as NodeParameterValueType, mapper, key);
		result[key] = mapping;
		allMappings.push(...all);
	}

	return [result, allMappings];
}

function resolveDuplicates(data: ExpressionMapping[], allNodeNames: string[]) {
	// Map from resulting variableName to the expressionData
	const triggerArgumentMap = new Map<string, ExpressionMapping>();
	const originalExpressionMap = new Map<string, string>();
	for (const mapping of data) {
		const { nodeNameInExpression, originalExpression, replacementPrefix } = mapping;
		let { replacementName } = mapping;
		const hasKeyAndCollides = (key: string) => {
			const value = triggerArgumentMap.get(key);
			if (!value) return false;
			return !isEqual(value, mapping);
		};

		// We need both parts in the key as we may need to pass e.g. `.first()` and `.item` separately
		// Since we cannot pass the node itself as its proxy reduces it to an empty object
		const key = () => `${replacementPrefix}.${replacementName}`;
		// This covers a realistic case where two nodes have the same path, e.g.
		//    $('original input').item.json.path.to.url
		//    $('some time later in the workflow').item.json.path.to.url
		if (hasKeyAndCollides(key())) {
			replacementName = `${convertToUniqueJsDotName(nodeNameInExpression, allNodeNames)}_${replacementName}`;
		}
		// This covers all other theoretical cases, like where `${node}_${variable}` might clash with another variable name
		while (hasKeyAndCollides(key())) replacementName += '_1';

		triggerArgumentMap.set(key(), {
			originalExpression,
			nodeNameInExpression,
			replacementName,
			replacementPrefix,
		});
		originalExpressionMap.set(originalExpression, key());
	}

	return {
		triggerArgumentMap,
		originalExpressionMap,
	};
}

// Recursively loop through the nodeProperties and apply `parameterExtractMapping` where applicable
function applyExtractMappingToNode(node: INode, parameterExtractMapping: ParameterExtractMapping) {
	const usedMappings: ExpressionMapping[] = [];

	const applyMapping = (
		parameters: NodeParameterValueType,
		mapping: ParameterExtractMapping,
	): NodeParameterValueType => {
		if (!mapping) return;
		if (typeof parameters !== 'object' || parameters === null) {
			if (Array.isArray(mapping) && typeof parameters === 'string') {
				for (const mapper of mapping) {
					const changed: string = parameters.replaceAll(
						mapper.originalExpression,
						`${mapper.replacementPrefix}.${mapper.replacementName}`,
					);
					if (changed !== parameters) usedMappings.push(mapper);
					parameters = changed;
				}
			}
			return parameters;
		}

		// This should be an invalid state, though an explicit check makes typings easier
		if (Array.isArray(mapping)) {
			return parameters;
		}

		if (Array.isArray(parameters) && typeof mapping === 'object' && !Array.isArray(mapping)) {
			return parameters.map((x, i) => applyMapping(x, mapping[i]) as INodeParameters);
		}

		return mapValues(parameters, (v, k) => applyMapping(v, mapping[k])) as NodeParameterValueType;
	};

	const parameters = applyMapping(node.parameters, parameterExtractMapping);

	return { result: { ...node, parameters } as INode, usedMappings };
}

/**
 * Extracts references to nodes in `nodeNames` from the nodes in `subGraph`.
 *
 * @returns an object with two keys:
 * 		- nodes: Transformed copies of nodes in `subGraph`, ready for use in a sub-workflow
 *    - variables: A map from variable name in the sub-workflow to the replaced expression
 *
 * @throws if the startNodeName already exists in `nodeNames`
 * @throws if `nodeNames` does not include all node names in `subGraph`
 */
export function extractReferencesInNodeExpressions(
	subGraph: INode[],
	nodeNames: string[],
	startNodeName: string,
) {
	if (nodeNames.includes(startNodeName))
		throw new OperationalError(
			`StartNodeName ${startNodeName} already exists in nodeNames: ${JSON.stringify(nodeNames)}`,
		);

	const subGraphNames = subGraph.map((x) => x.name);

	if (subGraphNames.some((x) => !nodeNames.includes(x))) {
		throw new OperationalError(
			`extractReferencesInNodeExpressions called with node in subGraph ${JSON.stringify(subGraphNames)} whose name is not in provided 'nodeNames' list ${JSON.stringify(nodeNames)}.`,
		);
	}

	// Compile all candidate regexp patterns
	//
	// This looks scary for large workflows, but RegExp should support >1 million characters and
	// it's a very linear pattern.
	const namesRegexp = '(' + nodeNames.map(escapeRegExp).join('|') + ')';
	const nodeRegexps = ACCESS_PATTERNS.map(
		(pattern) =>
			[
				pattern.checkPattern,
				// avoid compiling the expensive regex for rare legacy ways of accessing nodes
				new LazyRegExp(() => pattern.replacePattern(namesRegexp), 'g'),
			] as const,
	);

	// This map is used to change the actual expressions once resolved
	const recMapByNode = new Map<string, ParameterExtractMapping>();
	// This is used to track all candidates for change, necessary for deduplication
	const allData = [];

	for (const node of subGraph) {
		const [parameterMapping, allMappings] = applyParameterMapping(node.parameters, (s) =>
			buildExtractWorkflowExpressionDataMap(s, nodeRegexps, nodeNames, startNodeName),
		);
		recMapByNode.set(node.name, parameterMapping);
		allData.push(...allMappings);
	}

	const subGraphNodeNames = new Set(subGraphNames);
	const dataFromOutsideSubgraph = allData.filter(
		(x) => !subGraphNodeNames.has(x.nodeNameInExpression),
	);
	const { originalExpressionMap, triggerArgumentMap } = resolveDuplicates(
		dataFromOutsideSubgraph,
		nodeNames,
	);

	// triggerArgumentMap[originalExpressionMap[originalExpression]] gets you the canonical object
	// This should never be undefined, unless something went wrong
	// Would rather skip it if something does go wrong, lest we create a conflict
	const getCanonicalData = (e: ExpressionMapping) => {
		const key = originalExpressionMap.get(e.originalExpression);
		if (!key) return undefined;
		return triggerArgumentMap.get(key);
	};

	// Todo: Describe this
	const walkRecMap = (mapping: ParameterExtractMapping): ParameterExtractMapping => {
		if (!mapping) return;
		if (Array.isArray(mapping)) {
			// Sort by longest so that we don't replace part of a longer expression
			// TODO: Check if sorting by shortest "just works"
			return mapping
				.map(getCanonicalData)
				.filter((x) => x !== undefined)
				.sort((a, b) => b.originalExpression.length - a.originalExpression.length);
		}
		return mapValues(mapping, (v) => walkRecMap(v));
	};

	for (const [key, value] of recMapByNode.entries()) {
		recMapByNode.set(key, walkRecMap(value));
	}

	const allUsedMappings = [];
	const output = [];
	for (const node of subGraph) {
		const { result, usedMappings } = applyExtractMappingToNode(node, recMapByNode.get(node.name));
		allUsedMappings.push(...usedMappings);
		output.push(result);
	}
	const variables = new Map(allUsedMappings.map((m) => [m.replacementName, m.originalExpression]));
	return { nodes: output, variables };
}
