/**
 * Janitor Script - Find and report unused methods across the codebase
 *
 * Usage:
 *   npx tsx scripts/janitor.ts                    # Analyze and show summary
 *   npx tsx scripts/janitor.ts --verbose          # Show per-file analysis
 *   npx tsx scripts/janitor.ts --fix              # Remove unused methods (dry-run)
 *   npx tsx scripts/janitor.ts --fix --write      # Actually remove unused methods
 */

import { Project, SyntaxKind, type ClassDeclaration, type SourceFile } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const DIRS_TO_SCAN = ['pages', 'composables', 'helpers', 'services'];

interface AnalysisResult {
	file: string;
	className: string;
	unusedMembers: string[];
	classUnused: boolean;
	isEmpty: boolean;
}

function hasExternalReferences(
	sourceFile: SourceFile,
	node: { findReferencesAsNodes: () => unknown[]; getStartLineNumber: () => number },
): boolean {
	const refs = node.findReferencesAsNodes() as {
		getSourceFile: () => SourceFile;
		getStartLineNumber: () => number;
	}[];
	return refs.some(
		(ref) =>
			ref.getSourceFile() !== sourceFile || ref.getStartLineNumber() !== node.getStartLineNumber(),
	);
}

function analyzeClass(
	sourceFile: SourceFile,
	classDecl: ClassDeclaration,
): { unused: string[]; total: number } {
	const unused: string[] = [];
	let total = 0;

	for (const method of classDecl.getMethods()) {
		if (method.hasModifier(SyntaxKind.PrivateKeyword)) continue;
		total++;
		if (!hasExternalReferences(sourceFile, method)) {
			unused.push(method.getName());
		}
	}

	for (const prop of classDecl.getProperties()) {
		if (
			prop.hasModifier(SyntaxKind.PrivateKeyword) ||
			prop.hasModifier(SyntaxKind.ProtectedKeyword)
		) {
			continue;
		}
		total++;
		if (!hasExternalReferences(sourceFile, prop)) {
			unused.push(prop.getName());
		}
	}

	return { unused, total };
}

function findTsFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...findTsFiles(fullPath));
		} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
			files.push(fullPath);
		}
	}
	return files;
}

function findFilesToAnalyze(): string[] {
	const baseDir = path.join(__dirname, '..');
	return DIRS_TO_SCAN.flatMap((dir) => {
		const dirPath = path.join(baseDir, dir);
		return fs.existsSync(dirPath) ? findTsFiles(dirPath) : [];
	});
}

async function main() {
	const args = process.argv.slice(2);
	const verbose = args.includes('--verbose');
	const fix = args.includes('--fix');
	const write = args.includes('--write');

	const filesToProcess = findFilesToAnalyze();
	const baseDir = path.join(__dirname, '..');

	const project = new Project({
		tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
	});

	const results: AnalysisResult[] = [];
	let totalMembers = 0;

	for (const file of filesToProcess) {
		const sourceFile = project.getSourceFile(file);
		if (!sourceFile) continue;

		for (const classDecl of sourceFile.getClasses()) {
			if (!classDecl.getName()) continue;

			const { unused, total } = analyzeClass(sourceFile, classDecl);
			totalMembers += total;

			results.push({
				file,
				className: classDecl.getName()!,
				unusedMembers: unused,
				classUnused: !hasExternalReferences(sourceFile, classDecl),
				isEmpty: total === 0,
			});

			if (verbose) {
				console.log(`  ${path.relative(baseDir, file)}: ${unused.length}/${total} unused`);
			}
		}
	}

	// Categorize
	const deadClasses = results.filter((r) => r.classUnused);
	const emptyClasses = results.filter((r) => !r.classUnused && r.isEmpty);
	const withUnused = results.filter(
		(r) => !r.classUnused && !r.isEmpty && r.unusedMembers.length > 0,
	);
	const totalUnused = results.reduce((sum, r) => sum + r.unusedMembers.length, 0);

	// Summary
	console.log(`\nAnalyzed ${results.length} classes, ${totalMembers} members`);
	const usagePercent =
		totalMembers > 0 ? (((totalMembers - totalUnused) / totalMembers) * 100).toFixed(1) : '100.0';
	console.log(`Usage: ${usagePercent}% (${totalUnused} unused)\n`);

	if (deadClasses.length > 0) {
		console.log(`Dead classes (${deadClasses.length}):`);
		for (const r of deadClasses) {
			console.log(`  ${path.relative(baseDir, r.file)}`);
		}
		console.log();
	}

	if (emptyClasses.length > 0) {
		console.log(`Empty classes (${emptyClasses.length}):`);
		for (const r of emptyClasses) {
			console.log(`  ${path.relative(baseDir, r.file)}`);
		}
		console.log();
	}

	if (withUnused.length > 0) {
		console.log(`Unused methods (${withUnused.length} files):`);
		withUnused.sort((a, b) => b.unusedMembers.length - a.unusedMembers.length);
		for (const r of withUnused) {
			console.log(`  ${path.relative(baseDir, r.file)}: ${r.unusedMembers.join(', ')}`);
		}
		console.log();
	}

	if (totalUnused === 0 && emptyClasses.length === 0) {
		console.log('All clean!');
	}

	// Fix mode
	if (fix && (withUnused.length > 0 || deadClasses.length > 0 || emptyClasses.length > 0)) {
		console.log(write ? 'Fixing...\n' : 'Dry run:\n');

		for (const r of [...deadClasses, ...emptyClasses]) {
			console.log(`  delete ${path.relative(baseDir, r.file)}`);
			if (write) fs.unlinkSync(r.file);
		}

		for (const r of withUnused) {
			const sourceFile = project.getSourceFile(r.file);
			const classDecl = sourceFile?.getClass(r.className);
			if (!classDecl) continue;

			for (const name of r.unusedMembers) {
				console.log(`  remove ${r.className}.${name}`);
				if (write) {
					classDecl.getMethod(name)?.remove();
					classDecl.getProperty(name)?.remove();
				}
			}
		}

		if (write) {
			await project.save();
			console.log('\nDone. Run: pnpm typecheck && pnpm lint');
		} else {
			console.log('\nUse --fix --write to apply.');
		}
	}
}

main().catch(console.error);
