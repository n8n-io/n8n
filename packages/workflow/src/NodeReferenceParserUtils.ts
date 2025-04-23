import { INode } from '.';

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
2. Ensure all replacementNames are unique, modify by combining with nodeName if needed
3. Create ExecuteWorkflow and Trigger with a variable for each replacementName, setting `toBeReplaced` as their expression
4. Replace `toBeReplaced` with `${replacementPrefix}.${replacementName}`



1. Create Map (toBeReplaced => ExtractWorkflowExpressionData)
2. Create inverse Map (replacementName => ExtractWorkflowExpressionData) while ensuring uniqueness
*/

type ExtractWorkflowExpressionData = {
	replacementOfOriginalExpression: string; // "$('abc').first().def.ghi";
	originalExpression: string; // "$('abc').first().def.ghi['mno']";
	previousNodeName: string; // 'abc';
	replacementPrefix: string; //  "$('Start').first()";
	replacementName: string; // "def_ghi";
};

const ITEM_ACCESSORS = ['first()', 'item'];

const DATA_ACCESSORS = ['json', 'binary'];

export function impl_buildExtractWorkflowExpressionDataMap(
	expression: string,
	nodeRegexps: ReadonlyArray<[AccessPattern, RegExp]>,
	nodeNames: string[],
	newName: string,
): Map<string, ExtractWorkflowExpressionData> {
	const result = new Map<string, ExtractWorkflowExpressionData>();

	return result;
}

export function buildExtractWorkflowExpressionDataMap(
	selectedNode: INode[],
	nodeNames: string[],
	newName: string = 'Start',
) {
	// Compile all candidate regexp patterns
	// Note that this also matches `$('NodeName1') + $('NodeName2')` with node name 'NodeName1') + $('NodeName2'
	// which needs to be filtered out later
	const nodeRegexps = ACCESS_PATTERNS.map(
		(pattern) => [pattern, new RegExp(pattern.replacePattern('w+'))] as const,
	);

	return result;
}
