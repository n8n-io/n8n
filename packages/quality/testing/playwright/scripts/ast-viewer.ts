/**
 * AST Viewer - Display the AST structure of a TypeScript file
 *
 * Usage:
 *   npx tsx scripts/ast-viewer.ts <file-path>
 *   npx tsx scripts/ast-viewer.ts pages/BasePage.ts
 *   npx tsx scripts/ast-viewer.ts --depth 3 pages/BasePage.ts
 */

import { Project, SyntaxKind, type Node } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

function getNodeDescription(node: Node): string {
	const kind = node.getKindName();
	const text = node.getText();
	const preview = text.length > 50 ? text.slice(0, 50) + '...' : text;
	const cleanPreview = preview.replace(/\n/g, '\\n');

	switch (node.getKind()) {
		case SyntaxKind.ClassDeclaration:
		case SyntaxKind.FunctionDeclaration:
		case SyntaxKind.MethodDeclaration:
		case SyntaxKind.PropertyDeclaration:
		case SyntaxKind.VariableDeclaration:
		case SyntaxKind.Parameter:
		case SyntaxKind.InterfaceDeclaration:
		case SyntaxKind.TypeAliasDeclaration:
		case SyntaxKind.EnumDeclaration: {
			const name = (node as { getName?: () => string | undefined }).getName?.();
			return name ? `${kind}: ${name}` : kind;
		}
		case SyntaxKind.Identifier:
		case SyntaxKind.StringLiteral:
		case SyntaxKind.NumericLiteral:
			return `${kind}: "${cleanPreview}"`;
		case SyntaxKind.ImportDeclaration:
		case SyntaxKind.ExportDeclaration:
			return `${kind}: ${cleanPreview}`;
		default:
			return kind;
	}
}

function printAST(node: Node, indent = 0, maxDepth = 10): void {
	if (indent > maxDepth) {
		console.log('  '.repeat(indent) + '...');
		return;
	}

	const description = getNodeDescription(node);
	const line = node.getStartLineNumber();
	console.log('  '.repeat(indent) + `${description} (line ${line})`);

	for (const child of node.getChildren()) {
		printAST(child, indent + 1, maxDepth);
	}
}

function main() {
	const args = process.argv.slice(2);

	let maxDepth = 10;
	let filePath: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--depth' && args[i + 1]) {
			maxDepth = parseInt(args[i + 1], 10);
			i++;
		} else if (!args[i].startsWith('-')) {
			filePath = args[i];
		}
	}

	if (!filePath) {
		console.error('Usage: npx tsx scripts/ast-viewer.ts [--depth N] <file-path>');
		process.exit(1);
	}

	const resolvedPath = path.isAbsolute(filePath)
		? filePath
		: path.resolve(path.join(__dirname, '..'), filePath);

	if (!fs.existsSync(resolvedPath)) {
		console.error(`File not found: ${resolvedPath}`);
		process.exit(1);
	}

	const project = new Project({
		tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
		skipAddingFilesFromTsConfig: true,
	});

	project.addSourceFileAtPath(resolvedPath);
	const sourceFile = project.getSourceFile(resolvedPath);

	if (!sourceFile) {
		console.error(`Could not parse file: ${resolvedPath}`);
		process.exit(1);
	}

	console.log(`AST for: ${path.relative(process.cwd(), resolvedPath)}\n`);
	printAST(sourceFile, 0, maxDepth);
}

main();
