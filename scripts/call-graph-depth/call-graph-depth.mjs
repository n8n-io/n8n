#!/usr/bin/env node
/**
 * Measure the static call depth of TypeScript source files. Run it as
 * `pnpm call-depth` from the repo root.
 *
 *   pnpm call-depth <file-or-dir>… [--tsconfig <path>] [--max <n>] [--json]
 *
 * The script builds one TypeScript program and resolves every call inside the
 * target files with the type checker. A graph node is a function-like
 * declaration in a target file. An edge goes from a function to each target
 * function that it calls or constructs. Calls into other files of the
 * repository or into dependencies end the chain, so the result is the depth of
 * the code under review, not of the whole repository.
 *
 * The depth of a function is the number of functions on its longest call
 * chain, the function itself included. A leaf has depth 1. Mutual recursion
 * collapses into one strongly connected component, and the report names it.
 *
 * Exit codes:
 *   0  — every function is at or below --max (or no --max given).
 *   1  — at least one function is deeper than --max.
 *   2  — usage error.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const SOURCE_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const IGNORED_SEGMENTS = ['node_modules', 'dist', '__tests__', '__mocks__'];
const TEST_FILE = /\.(test|spec)\.[cm]?tsx?$/;

/** Parse the command line into options. Throws a usage error as an Error. */
export function parseArgs(argv) {
	const options = { targets: [], tsconfig: undefined, max: undefined, json: false };
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === '--json') options.json = true;
		else if (arg === '--tsconfig') options.tsconfig = requireValue(argv, ++index, arg);
		else if (arg === '--max') options.max = parseMax(requireValue(argv, ++index, arg));
		else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
		else options.targets.push(arg);
	}
	if (options.targets.length === 0) throw new Error('Give at least one file or directory');
	return options;
}

function requireValue(argv, index, flag) {
	const value = argv[index];
	if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
	return value;
}

function parseMax(value) {
	const max = Number(value);
	if (!Number.isInteger(max) || max < 1) throw new Error('--max must be a positive integer');
	return max;
}

/** True when a path is a source file that the report should include. */
export function isTargetSource(filePath) {
	if (!SOURCE_EXTENSIONS.some((ext) => filePath.endsWith(ext))) return false;
	if (filePath.endsWith('.d.ts') || TEST_FILE.test(filePath)) return false;
	return !filePath.split(path.sep).some((segment) => IGNORED_SEGMENTS.includes(segment));
}

/** Expand files and directories into absolute source file paths. */
export function collectFiles(targets) {
	const files = new Set();
	const visit = (entry) => {
		const absolute = path.resolve(entry);
		if (!existsSync(absolute)) throw new Error(`Not found: ${entry}`);
		if (statSync(absolute).isDirectory()) {
			for (const child of readdirSync(absolute)) {
				if (!IGNORED_SEGMENTS.includes(child)) visit(path.join(absolute, child));
			}
		} else if (isTargetSource(absolute)) {
			files.add(absolute);
		}
	};
	targets.forEach(visit);
	return [...files].sort();
}

/**
 * Tarjan's algorithm. Returns the strongly connected components of a graph
 * given as `Map<node, Set<node>>`, in reverse topological order.
 */
export function stronglyConnectedComponents(graph) {
	let counter = 0;
	const index = new Map();
	const lowLink = new Map();
	const onStack = new Set();
	const stack = [];
	const components = [];

	const connect = (node) => {
		index.set(node, counter);
		lowLink.set(node, counter);
		counter++;
		stack.push(node);
		onStack.add(node);
		for (const next of graph.get(node) ?? []) {
			if (!index.has(next)) {
				connect(next);
				lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(next)));
			} else if (onStack.has(next)) {
				lowLink.set(node, Math.min(lowLink.get(node), index.get(next)));
			}
		}
		if (lowLink.get(node) === index.get(node)) {
			const component = [];
			let member;
			do {
				member = stack.pop();
				onStack.delete(member);
				component.push(member);
			} while (member !== node);
			components.push(component);
		}
	};

	for (const node of graph.keys()) if (!index.has(node)) connect(node);
	return components;
}

/** The deepest already-solved entry among the successors of a component. */
function deepestSuccessor(graph, component, entryOf) {
	let deepest;
	for (const node of component) {
		for (const next of graph.get(node) ?? []) {
			const candidate = entryOf(next);
			if (candidate && (!deepest || candidate.depth > deepest.depth)) deepest = candidate;
		}
	}
	return deepest;
}

/**
 * Longest call chain from every node. A strongly connected component counts
 * as one step, because recursion has no static bound. Returns
 * `Map<node, { depth, chain, recursive }>`.
 */
export function longestChains(graph) {
	const components = stronglyConnectedComponents(graph);
	const componentOf = new Map();
	components.forEach((component, componentIndex) => {
		for (const node of component) componentOf.set(node, componentIndex);
	});

	// Tarjan emits components callee-first, so one pass in order is enough.
	const best = new Map();
	components.forEach((component, componentIndex) => {
		const bestNext = deepestSuccessor(graph, component, (next) => {
			const nextComponent = componentOf.get(next);
			return nextComponent === componentIndex ? undefined : best.get(nextComponent);
		});
		const head = [...component].sort()[0];
		best.set(componentIndex, {
			depth: 1 + (bestNext?.depth ?? 0),
			chain: [head, ...(bestNext?.chain ?? [])],
			recursive: component.length > 1 || (graph.get(head) ?? new Set()).has(head),
		});
	});

	const result = new Map();
	for (const node of graph.keys()) {
		const entry = best.get(componentOf.get(node));
		result.set(node, {
			depth: entry.depth,
			chain: [node, ...entry.chain.slice(1)],
			recursive: entry.recursive,
		});
	}
	return result;
}

function loadTypeScript() {
	const require = createRequire(import.meta.url);
	return require('typescript');
}

function readCompilerOptions(ts, tsconfigPath, files) {
	const configPath =
		tsconfigPath ?? ts.findConfigFile(path.dirname(files[0]), ts.sys.fileExists, 'tsconfig.json');
	if (!configPath)
		return { options: { allowJs: false, skipLibCheck: true }, configPath: undefined };
	const read = ts.readConfigFile(configPath, ts.sys.readFile);
	if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
	const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath));
	return { options: { ...parsed.options, noEmit: true }, configPath };
}

function isFunctionLike(ts, node) {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node) ||
		ts.isArrowFunction(node) ||
		ts.isFunctionExpression(node)
	);
}

function identifierText(ts, nameNode) {
	return nameNode && ts.isIdentifier(nameNode) ? nameNode.text : undefined;
}

const NAMED_PARENT_KINDS = [
	'isVariableDeclaration',
	'isPropertyAssignment',
	'isPropertyDeclaration',
];

function functionName(ts, node) {
	if (ts.isConstructorDeclaration(node)) return 'constructor';
	const own = identifierText(ts, node.name);
	if (own) return own;
	const parent = node.parent;
	const namedParent = parent && NAMED_PARENT_KINDS.some((kind) => ts[kind](parent));
	return namedParent ? identifierText(ts, parent.name) : undefined;
}

function functionLabel(ts, node, sourceFile) {
	const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
	const file = path.relative(process.cwd(), sourceFile.fileName);
	const ownerName = ts.isClassLike(node.parent) ? identifierText(ts, node.parent.name) : undefined;
	const owner = ownerName ? `${ownerName}.` : '';
	return `${file}:${line} ${owner}${functionName(ts, node) ?? '<anonymous>'}`;
}

function resolveSymbol(ts, checker, call) {
	const location = ts.isPropertyAccessExpression(call.expression)
		? call.expression.name
		: call.expression;
	const symbol = checker.getSymbolAtLocation(location);
	if (!symbol) return undefined;
	return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

/** The function body behind one declaration of a callee, if there is one. */
function functionOfDeclaration(ts, declaration, call) {
	if (isFunctionLike(ts, declaration)) return declaration;
	const hasInitializer =
		ts.isVariableDeclaration(declaration) || ts.isPropertyDeclaration(declaration);
	if (hasInitializer && declaration.initializer && isFunctionLike(ts, declaration.initializer)) {
		return declaration.initializer;
	}
	if (ts.isClassDeclaration(declaration) && ts.isNewExpression(call)) {
		return declaration.members.find((member) => ts.isConstructorDeclaration(member));
	}
	return undefined;
}

function calleeDeclarations(ts, checker, call) {
	const symbol = resolveSymbol(ts, checker, call);
	return (symbol?.declarations ?? [])
		.map((declaration) => functionOfDeclaration(ts, declaration, call))
		.filter(Boolean);
}

/** Build the call graph of the target files. Returns `Map<label, Set<label>>`. */
export function buildCallGraph(files, { tsconfig } = {}) {
	const ts = loadTypeScript();
	const { options } = readCompilerOptions(ts, tsconfig, files);
	const program = ts.createProgram({ rootNames: files, options });
	const checker = program.getTypeChecker();
	const targetSet = new Set(files.map((file) => path.resolve(file)));
	const labels = new Map();
	const graph = new Map();

	const labelOf = (node) => {
		if (!labels.has(node)) {
			const label = functionLabel(ts, node, node.getSourceFile());
			labels.set(node, label);
			if (!graph.has(label)) graph.set(label, new Set());
		}
		return labels.get(node);
	};

	const enclosingFunction = (node) => {
		let current = node.parent;
		while (current && !isFunctionLike(ts, current)) current = current.parent;
		return current;
	};

	for (const sourceFile of program.getSourceFiles()) {
		if (!targetSet.has(path.resolve(sourceFile.fileName))) continue;
		const visit = (node) => {
			if (isFunctionLike(ts, node)) labelOf(node);
			if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
				const caller = enclosingFunction(node);
				if (caller) {
					for (const declaration of calleeDeclarations(ts, checker, node)) {
						if (!targetSet.has(path.resolve(declaration.getSourceFile().fileName))) continue;
						graph.get(labelOf(caller)).add(labelOf(declaration));
					}
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(sourceFile);
	}
	return graph;
}

function deepestPerFile(chains) {
	const byFile = new Map();
	for (const [node, entry] of chains) {
		const file = node.split(':')[0];
		const current = byFile.get(file);
		if (!current || entry.depth > current.depth) {
			byFile.set(file, { depth: entry.depth, chain: entry.chain });
		}
	}
	return [...byFile]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([file, entry]) => ({ file, ...entry }));
}

function deepestOverall(chains) {
	let deepest;
	for (const [node, entry] of chains) {
		if (!deepest || entry.depth > deepest.depth) deepest = { node, ...entry };
	}
	return deepest;
}

/** Summarise chains per file and overall. */
export function summarise(chains, max) {
	const entries = [...chains];
	const deepest = deepestOverall(chains);
	const overLimit =
		max === undefined
			? []
			: entries
					.filter(([, entry]) => entry.depth > max)
					.map(([node, entry]) => ({ node, depth: entry.depth, chain: entry.chain }));
	return {
		functions: chains.size,
		maxDepth: deepest?.depth ?? 0,
		deepestChain: deepest?.chain ?? [],
		files: deepestPerFile(chains),
		overLimit,
		recursive: entries.filter(([, entry]) => entry.recursive).map(([node]) => node),
	};
}

function printText(summary, max) {
	console.log(`Functions analysed: ${summary.functions}`);
	console.log(`Maximum call depth: ${summary.maxDepth}${max ? ` (limit ${max})` : ''}`);
	if (summary.deepestChain.length)
		console.log(`Deepest chain:\n  ${summary.deepestChain.join('\n  → ')}`);
	console.log('\nPer file (max depth):');
	for (const row of summary.files) console.log(`  ${String(row.depth).padStart(2)}  ${row.file}`);
	if (summary.recursive.length) console.log(`\nRecursive functions: ${summary.recursive.length}`);
	if (summary.overLimit.length) {
		console.log(`\nOver the limit (${summary.overLimit.length}):`);
		for (const row of summary.overLimit) console.log(`  ${row.depth}  ${row.node}`);
	}
}

export function main(argv) {
	let options;
	try {
		options = parseArgs(argv);
	} catch (error) {
		console.error(`call-depth: ${error.message}`);
		return 2;
	}
	const files = collectFiles(options.targets);
	if (files.length === 0) {
		console.error('call-depth: no source files found');
		return 2;
	}
	const chains = longestChains(buildCallGraph(files, options));
	const summary = summarise(chains, options.max);
	if (options.json) console.log(JSON.stringify(summary, null, 2));
	else printText(summary, options.max);
	return summary.overLimit.length > 0 ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exitCode = main(process.argv.slice(2));
}
