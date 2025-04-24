import { escapeRegExp } from 'lodash';

import type { INode, NodeParameterValueType } from './Interfaces';

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

type ReferenceReplacementResult = {
	expression: string; // generated expression
	replacedReferenceMatches: Map<string, number[]>; // Map from nodeName to index one past the replacement
};

/**
1. Detect usages and note down the whole expression to be replaced
		$('abc').first().def.ghi['mno'] =>
			type ExtractWorkflowExpressionData = {
				toBeReplaced: "$('abc').first().def.ghi",
				expression: "$('abc').first().def.ghi['mno']",
				nodeName: 'abc',
				replacementPrefix: "$('Start').first()",
				replacementName: "def_ghi"
			}
1.5 Filter for:
	- previous nodes before input node (which go into ExecuteWorkflow)
	- inner nodes (no changes for other inner nodes, replace for previous nodes)
	- following nodes after output nodes -> error unless it's only output node of selection
2. Ensure all replacementNames are unique, modify by combining with nodeName if needed
3. Create ExecuteWorkflow and Trigger with a variable for each replacementName, setting `toBeReplaced` as their expression
4. Replace `toBeReplaced` with `${replacementPrefix}.${replacementName}`



1. Create Map (toBeReplaced => ExtractWorkflowExpressionData)
2. Create inverse Map (replacementName => ExtractWorkflowExpressionData) while ensuring uniqueness
*/

type ExtractWorkflowExpressionData = {
	nodeNameInExpression: string; // 'abc';
	originalExpression: string; // "$('abc').first().def.ghi";
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
			return {
				nodeNameInExpression,
				originalExpression: `${exprStart}.${parts[0]}`, // $('abc').first()
				replacementPrefix: `$('Start').${parts[0]}`, //  $('Start').first()
				replacementName: `${nodeNameInExpression}_${parts[0].split('(')[0]}`, // nodeName_first
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
					replacementPrefix: `$('Start').${parts[0]}.${parts[1]}`, // $('Start').item.json
					replacementName: parts.slice(2, partsIdx).join('_'), // valid_until
				};
			} else {
				// this case covers any normal ObjectExtensions functions called on the ITEM_TO_DATA_ACCESSORS
				// e.g. $('nodeName').first().toJsonObject()
				return {
					nodeNameInExpression,
					originalExpression: `${exprStart}.${parts[0]}`, // $('abc').first()
					replacementPrefix: `$('Start').${parts[0]}`, //  $('Start').first()
					replacementName: `${nodeNameInExpression}_${parts[0].split('(')[0]}`, // nodeName_first
				};
			}
		}
	}

	const itemAccessorMatch = ITEM_ACCESSORS.flatMap((x) => (x === parts[0] ? x : []))[0];
	if (itemAccessorMatch !== undefined) {
		return {
			nodeNameInExpression,
			originalExpression: `${exprStart}.${parts[0]}`, // $('abc').isExecuted
			replacementPrefix: `$('Start').${parts[0]}`, //  $('Start').isExecuted
			replacementName: `${nodeNameInExpression}_${parts[0]}`, // nodeName_isExecuted
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

// const EXPRESSION_CONTINUE_REGEX = /[ ,+/*\-\(\[]/;

// function growExpression(expression: string) {
// 	for (let i = 0; i < expression.length; ++i) {
// 		if (expression[i])
// 	}
// }

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

type ParameterMapping<T> = undefined | T[] | { [key: string]: T[] | ParameterMapping<T> };

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

export function buildExtractWorkflowExpressionDataMap(nodes: INode[], nodeNames: string[]) {
	// Compile all candidate regexp patterns
	//
	// This looks scary for large workflows, but RegExp should support >1 million characters and
	// it's a very linear pattern.
	// The alternative is to match `\w+`, which also matches `$('NodeName1') + $('NodeName2')` with
	// node name 'NodeName1') + $('NodeName2' which would need to be filtered out later
	// That approach also risks being computationally expensive relative to expression length, rather than node count
	const namesRegexp = nodeNames.map(escapeRegExp).join('|');
	const nodeRegexps = ACCESS_PATTERNS.map(
		(pattern) =>
			[
				new RegExp(pattern.checkPattern),
				new LazyRegExp(() => pattern.replacePattern(namesRegexp), 'g'),
			] as const,
	);

	// This map is used to change the actual expressions once resolved
	const recMapByNode = new Map<string, ParameterExtractMapping>();
	// This map is used to track all candidates for change, necessary for deduplication
	const flatMapByNode = new Map<string, ExtractWorkflowExpressionData[]>();

	for (const node of nodes) {
		const [parameterMapping, allMappings] = rec_applyParameterMapping(node.parameters, (s) =>
			impl_buildExtractWorkflowExpressionDataMap(s, nodeRegexps, nodeNames),
		);
		recMapByNode.set(node.name, parameterMapping);
		flatMapByNode.set(node.name, allMappings);
	}
}
