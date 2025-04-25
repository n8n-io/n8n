import { escapeRegExp } from 'lodash';

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

type ExtractWorkflowExpressionData = {
	nodeNameInExpression: string; // 'abc';
	originalExpression: string; // "$('abc').first().def.ghi";
	originalName: string; // def.ghi
	replacementPrefix: string; //  "$('Start').first()";
	replacementName: string; // "def_ghi";
};

const DOT_REFERENCEABLE_JS_VARIABLE = /\w[\w\d_\$]*/;
const INVALID_JS_DOT_REFERENCE = /[^.\w\d_\$]/;

/**
 *  We want to try and extract these if possible, so that we turn
 * 	$('myNode').ITEM_ACCESSOR.DATA_ACCESSOR.a.b['c'] => [$('myNode').ITEM_ACCESSOR.DATA_ACCESSOR.a.b, a_b['c']]
 */

// These allow one of the DATA_ACCESSORS
const ITEM_TO_DATA_ACCESSORS = [
	/^first\(\)$/,
	/^last\(\)$/,
	/^all$/,
	/^item$/,
	/^itemMatching(\d+)$/, // We only support trivial itemMatching - this could in theory hold an entirely new expression
];
// These we can convert to an argument
const ITEM_ACCESSORS = ['params', 'isExecuted'];
// These we'll just need to carry over into the workflow, pasting the whole node
const NODE_ACCESSORS_STARTS = ['itemMatching'];

// $('nodeName'). is equivalent to $ for previous node
const DATA_ACCESSORS = ['json', 'binary'];

function jsifyNodeName(nodeName: string, allNodeNames: string[]) {
	let jsLegal = nodeName
		.replaceAll(' ', '_')
		.split('')
		.filter((x) => !INVALID_JS_DOT_REFERENCE.test(x))
		.join('');

	if (nodeName === jsLegal) return jsLegal;

	// This accounts for theoretical cases where we collide with other reduced names
	// By adding our own index in the array we also avoid running into theoretical cases
	// where a node with the name 'ourName_27' exists for our reduced name 'ourName'
	// because we must have a different index, so therefore only one of us can be `ourName_27_27`
	//
	// The underscore prevents confusing e.g. index 1 with 11
	while (allNodeNames.includes(jsLegal)) jsLegal += `_${allNodeNames.indexOf(nodeName)}`;
	return jsLegal;
}

// Grow the selection as long as we follow a simple path structure:
// - $('myName').a.b.c => from first dot to full expression
// - $('myName').a.b['c'] => from first dot to b
// - $('myName').itemMatching(0) => node itself only
//
// Note that we start after the . after the nodeName reference
export function parseExtractWorkflowExpressionData(
	expression: string,
	startIndex: number,
	nodeNameInExpression: string,
	nodeNamePlainJs: string,
): null | ExtractWorkflowExpressionData {
	const exprStart = expression.slice(0, startIndex);
	const exprWithoutNode = expression.slice(startIndex);
	const parts = exprWithoutNode.split('.');

	if (parts.length === 0) {
		// If a node is referenced by name without any accessor we return a proxy that stringifies as an empty object
		// But it can still be validly passed to other functions
		// However when passed to a sub-workflow it "collapses" into a true empty object
		// So lets just abort porting this and don't touch it
		return null;
	}
	if (ITEM_TO_DATA_ACCESSORS.some((x) => parts[0].match(x))) {
		if (parts.length === 1) {
			// this is a weird, but valid case
			const originalName = parts[0];
			return {
				nodeNameInExpression,
				originalExpression: `${exprStart}.${parts[0]}`, // $('abc').first()
				originalName, // first()
				replacementPrefix: `$('Start').${parts[0]}`, //  $('Start').first()
				replacementName: `${nodeNamePlainJs}_${originalName.split('(')[0]}`, // nodeName_first
			};
		} else {
			if (DATA_ACCESSORS.some((x) => parts[1] === x)) {
				let partsIdx = 2;
				for (; partsIdx < parts.length; ++partsIdx) {
					if (!DOT_REFERENCEABLE_JS_VARIABLE.test(parts[partsIdx])) break;
				}
				return {
					nodeNameInExpression,
					originalExpression: `${exprStart}.${parts.slice(0, partsIdx + 1).join('.')}`, // $('abc').item.json.valid.until  and not ['x'] after
					originalName: parts.slice(2, partsIdx).join('.'), // valid.until
					replacementPrefix: `$('Start').${parts[0]}.${parts[1]}`, // $('Start').item.json
					replacementName: parts.slice(2, partsIdx).join('_'), // valid_until
				};
			} else {
				// this case covers any normal ObjectExtensions functions called on the ITEM_TO_DATA_ACCESSORS
				// e.g. $('nodeName').first().toJsonObject().randomJSFunction()
				const originalName = parts[0];
				return {
					nodeNameInExpression,
					originalExpression: `${exprStart}.${parts[0]}`, // $('abc').first()
					originalName, // first()
					replacementPrefix: `$('Start').${parts[0]}`, //  $('Start').first()
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
			originalName: parts[0],
			replacementPrefix: `$('Start').${parts[0]}`, //  $('Start').isExecuted
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

// Map from `statementToBeReplaced` -> ExtractWorkflowExpressionData
export function impl_buildExtractWorkflowExpressionDataMap(
	expression: string,
	nodeRegexps: Array<readonly [RegExp, LazyRegExp]>,
	nodeNames: string[],
): ExtractWorkflowExpressionData[] {
	const result: ExtractWorkflowExpressionData[] = [];

	for (const [pattern, regexp] of nodeRegexps) {
		if (pattern.test(expression)) {
			const res = expression.matchAll(regexp.get());
			for (const match of res) {
				const startIndex = match.index;
				const endIndex = startIndex + match[0].length;
				// this works because all access patterns define match groups left and right of the name
				const nodeNameInExpression = match[0][1];

				if (!nodeNames.includes(nodeNameInExpression)) continue;

				const firstImpossibleIdx = INVALID_JS_DOT_REFERENCE.exec(expression)?.index;
				const candidate = expression.slice(endIndex + 1, firstImpossibleIdx);
				const data = parseExtractWorkflowExpressionData(
					candidate,
					endIndex + 1, // skip the dot
					nodeNameInExpression,
					jsifyNodeName(nodeNameInExpression, nodeNames),
				);
				if (data !== null) result.push({ ...data, nodeNameInExpression });
			}
		}
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

type ParameterExtractMapping = ParameterMapping<ExtractWorkflowExpressionData>;

// Note that this returns a Record<number, X> for arrays, to allow sparse mapping
function rec_applyParameterMapping(
	parameterValue: NodeParameterValueType,
	mapper: (s: string) => ExtractWorkflowExpressionData[],
): [ParameterExtractMapping, ExtractWorkflowExpressionData[]] {
	const result: ParameterExtractMapping = {};

	if (typeof parameterValue !== 'object' || parameterValue === null) {
		if (typeof parameterValue === 'string' && parameterValue.charAt(0) === '=') {
			const mapping = mapper(parameterValue);
			return [mapping, mapping];
		}
		return [undefined, []];
	}

	const allMappings = [];
	for (const [key, value] of Object.entries(parameterValue)) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const [mapping, all] = rec_applyParameterMapping(value, mapper);
		result[key] = mapping;
		allMappings.push(...all);
	}

	return [result, allMappings];
}

function resolveDuplicates(data: ExtractWorkflowExpressionData[], allNodeNames: string[]) {
	/**
	 * 		$('abc').first().def.ghi['mno'] =>
			type ExtractWorkflowExpressionData = {
				originalExpression: "$('abc').first().json.def.ghi",
				nodeNameInExpression: 'abc',
				originalName: 'def.ghi',
				replacementPrefix: "$('Start').first().json",
				replacementName: "def_ghi"
			}
	 *
	 */

	// Map from variableName -> its expression
	const triggerArgumentMap = new Map<string, ExtractWorkflowExpressionData>();
	const originalExpressionMap = new Map<string, string>();
	for (const mapping of data) {
		const { nodeNameInExpression, originalExpression, replacementPrefix, originalName } = mapping;
		let { replacementName } = mapping;
		const hasKeyAndDiffers = (key: string) => {
			const value = triggerArgumentMap.get(key);
			if (!value) return false;
			// We particularly do not care about the input node name here
			// Because we're building this map for usage with the $('Start') node
			return value.originalName !== originalName;
		};
		// We need both parts in the key as we may need to pass `.first()` and `.item` separately
		// Since we cannot pass the node itself as its proxy reduces it to an empty object
		const key = () => `${replacementPrefix}.${replacementName}`;
		// This covers a realistic case where two nodes have the same path, e.g.
		//    $('original input').item.json.path.to.url
		//    $('some time later in the workflow').item.json.path.to.url
		if (hasKeyAndDiffers(key())) {
			replacementName = `${jsifyNodeName(nodeNameInExpression, allNodeNames)}_${replacementName}`;
		}
		// This covers theoretical cases, where a node might be named Start or other edge cases
		while (hasKeyAndDiffers(key())) replacementName += '_1';

		triggerArgumentMap.set(key(), {
			originalName,
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

function applyExtractMappingToNode(node: INode, parameterExtractMapping: ParameterExtractMapping) {
	const usedMappings: ExtractWorkflowExpressionData[] = [];
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

		return Object.fromEntries(
			Object.entries(parameters).map(([k, v]) => [
				k,
				applyMapping(v as NodeParameterValueType, mapping[k]),
			]),
		);
	};

	const parameters = applyMapping(node.parameters, parameterExtractMapping);

	return { result: { ...node, parameters } as INode, usedMappings };
}

/**
1.5 [TODO] Filter for:
	- previous nodes before input node (which go into ExecuteWorkflow)
	- inner nodes (no changes for other inner nodes, replace for previous nodes)
	- following nodes after output nodes -> error unless it's only output node of selection
*/
export function buildExtractWorkflowExpressionDataMap(nodes: INode[], nodeNames: string[]) {
	// Compile all candidate regexp patterns
	//
	// This looks scary for large workflows, but RegExp should support >1 million characters and
	// it's a very linear pattern.
	const namesRegexp = nodeNames.map(escapeRegExp).join('|');
	const nodeRegexps = ACCESS_PATTERNS.map(
		(pattern) =>
			[
				new RegExp(pattern.checkPattern),
				// avoid compiling the expensive regex for rare legacy ways of accessing nodes
				new LazyRegExp(() => pattern.replacePattern(namesRegexp), 'g'),
			] as const,
	);

	// This map is used to change the actual expressions once resolved
	const recMapByNode = new Map<string, ParameterExtractMapping>();
	// This is used to track all candidates for change, necessary for deduplication
	const allData = [];
	for (const node of nodes) {
		const [parameterMapping, allMappings] = rec_applyParameterMapping(node.parameters, (s) =>
			impl_buildExtractWorkflowExpressionDataMap(s, nodeRegexps, nodeNames),
		);
		recMapByNode.set(node.name, parameterMapping);
		allData.push(...allMappings);
	}

	// Todo(perf): filter/rebuild oldData for only the relevant nodes

	const { originalExpressionMap, triggerArgumentMap } = resolveDuplicates(allData, nodeNames);

	// triggerArgumentMap[originalExpressionMap[originalExpression]] gets you the canonical object
	// This should never be undefined, unless something went wrong
	// Would rather skip it if something does go wrong, lest we create a conflict
	const getCanonicalData = (e: ExtractWorkflowExpressionData) => {
		const key = originalExpressionMap.get(e.originalExpression);
		if (!key) return undefined;
		return triggerArgumentMap.get(key);
	};

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
		return Object.fromEntries(Object.entries(mapping).map(([k, v]) => [k, walkRecMap(v)]));
	};

	for (const [key, value] of recMapByNode.entries()) {
		recMapByNode.set(key, walkRecMap(value));
	}

	const allUsedMappings = [];
	const output = [];
	for (const node of nodes) {
		const { result, usedMappings } = applyExtractMappingToNode(node, recMapByNode.get(node.name));
		allUsedMappings.push(...usedMappings);
		output.push(result);
	}
	const variables = new Map(allUsedMappings.map((m) => [m.replacementName, m.originalExpression]));
	return { nodes, variables };
}
