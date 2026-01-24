/**
 * Janitor Script - Find and report unused methods across the codebase
 *
 * Usage:
 *   npx tsx scripts/janitor.ts                    # Analyze all, show unused
 *   npx tsx scripts/janitor.ts --top 10           # Analyze top 10 largest files
 *   npx tsx scripts/janitor.ts --fix              # Remove unused methods (dry-run)
 *   npx tsx scripts/janitor.ts --fix --write      # Actually remove unused methods
 *   npx tsx scripts/janitor.ts --reset-cache      # Clear the cache and re-analyze
 */

import { Project, SyntaxKind, type ClassDeclaration, type SourceFile } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const CACHE_FILE = path.join(__dirname, '.janitor-cache.json');
const DIRS_TO_SCAN = ['pages', 'composables', 'helpers', 'services'];

interface CacheEntry {
	file: string;
	hash: string; // Simple hash of file content
	unusedCount: number;
	analyzedAt: string;
}

interface AnalysisResult {
	file: string;
	className: string;
	totalMembers: number;
	unusedMembers: string[];
	usedMembers: number;
	lines: number;
	fromCache: boolean;
	classUnused: boolean; // True if the class itself is never referenced
}

function isClassUnused(
	_project: Project,
	sourceFile: SourceFile,
	classDecl: ClassDeclaration,
): boolean {
	const refs = classDecl.findReferencesAsNodes();

	// Filter out:
	// - The class definition itself
	// - References within the same file (internal usage)
	const externalRefs = refs.filter((ref) => {
		const refFile = ref.getSourceFile();
		// Same file = not external
		if (refFile === sourceFile) return false;
		return true;
	});

	return externalRefs.length === 0;
}

// Simple hash function
function hashContent(content: string): string {
	let hash = 0;
	for (let i = 0; i < content.length; i++) {
		const char = content.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return hash.toString(16);
}

function loadCache(): Map<string, CacheEntry> {
	if (fs.existsSync(CACHE_FILE)) {
		const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
		return new Map(Object.entries(data));
	}
	return new Map();
}

function saveCache(cache: Map<string, CacheEntry>): void {
	const data = Object.fromEntries(cache);
	fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

function findClassesInFile(sourceFile: SourceFile): ClassDeclaration[] {
	return sourceFile.getClasses().filter((c) => c.getName() !== undefined);
}

function analyzeClass(
	_project: Project,
	sourceFile: SourceFile,
	classDecl: ClassDeclaration,
): { unused: string[]; total: number } {
	const unused: string[] = [];
	let total = 0;

	// Analyze methods
	for (const method of classDecl.getMethods()) {
		// Skip private methods
		if (method.hasModifier(SyntaxKind.PrivateKeyword)) continue;

		total++;
		const methodName = method.getName();
		const refs = method.findReferencesAsNodes();

		const externalUsages = refs.filter((ref) => {
			const refFile = ref.getSourceFile();
			if (refFile === sourceFile && ref.getStartLineNumber() === method.getStartLineNumber()) {
				return false;
			}
			return true;
		});

		if (externalUsages.length === 0) {
			unused.push(methodName);
		}
	}

	// Analyze public properties
	for (const prop of classDecl.getProperties()) {
		if (
			prop.hasModifier(SyntaxKind.PrivateKeyword) ||
			prop.hasModifier(SyntaxKind.ProtectedKeyword)
		) {
			continue;
		}

		total++;
		const propName = prop.getName();
		const refs = prop.findReferencesAsNodes();

		const externalUsages = refs.filter((ref) => {
			const refFile = ref.getSourceFile();
			if (refFile === sourceFile && ref.getStartLineNumber() === prop.getStartLineNumber()) {
				return false;
			}
			return true;
		});

		if (externalUsages.length === 0) {
			unused.push(propName);
		}
	}

	return { unused, total };
}

function findFilesToAnalyze(): { file: string; lines: number }[] {
	const files: { file: string; lines: number }[] = [];

	for (const dir of DIRS_TO_SCAN) {
		const dirPath = path.join(__dirname, '..', dir);
		if (!fs.existsSync(dirPath)) continue;

		const entries = fs.readdirSync(dirPath, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
				const filePath = path.join(dir, entry.name);
				const fullPath = path.join(__dirname, '..', filePath);
				const content = fs.readFileSync(fullPath, 'utf-8');
				const lines = content.split('\n').length;
				files.push({ file: filePath, lines });
			}
			// Handle subdirectories (e.g., pages/components)
			if (entry.isDirectory()) {
				const subDirPath = path.join(dirPath, entry.name);
				const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true });
				for (const subEntry of subEntries) {
					if (
						subEntry.isFile() &&
						subEntry.name.endsWith('.ts') &&
						!subEntry.name.endsWith('.spec.ts')
					) {
						const filePath = path.join(dir, entry.name, subEntry.name);
						const fullPath = path.join(__dirname, '..', filePath);
						const content = fs.readFileSync(fullPath, 'utf-8');
						const lines = content.split('\n').length;
						files.push({ file: filePath, lines });
					}
				}
			}
		}
	}

	// Sort by lines descending
	return files.sort((a, b) => b.lines - a.lines);
}

async function main() {
	const args = process.argv.slice(2);
	const topN = args.includes('--top') ? parseInt(args[args.indexOf('--top') + 1]) : undefined;
	const resetCache = args.includes('--reset-cache');
	const fix = args.includes('--fix');
	const write = args.includes('--write');

	if (resetCache && fs.existsSync(CACHE_FILE)) {
		fs.unlinkSync(CACHE_FILE);
		console.log('Cache cleared.\n');
	}

	const cache = loadCache();
	const allFiles = findFilesToAnalyze();
	const filesToProcess = topN ? allFiles.slice(0, topN) : allFiles;

	console.log(`\nJanitor: Analyzing ${filesToProcess.length} files for unused methods\n`);
	console.log('='.repeat(70));

	const project = new Project({
		tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
	});

	const results: AnalysisResult[] = [];
	let skippedFromCache = 0;

	for (const { file, lines } of filesToProcess) {
		const fullPath = path.join(__dirname, '..', file);
		const content = fs.readFileSync(fullPath, 'utf-8');
		const hash = hashContent(content);

		// Check cache
		const cached = cache.get(file);
		if (cached && cached.hash === hash && cached.unusedCount === 0) {
			skippedFromCache++;
			continue; // Skip clean files
		}

		const sourceFile = project.getSourceFile(fullPath);
		if (!sourceFile) continue;

		const classes = findClassesInFile(sourceFile);
		if (classes.length === 0) continue;

		for (const classDecl of classes) {
			const className = classDecl.getName()!;
			process.stdout.write(`Analyzing ${file} (${className})...`);

			const { unused, total } = analyzeClass(project, sourceFile, classDecl);
			const classUnused = isClassUnused(project, sourceFile, classDecl);

			// Update cache
			cache.set(file, {
				file,
				hash,
				unusedCount: unused.length,
				analyzedAt: new Date().toISOString(),
			});

			results.push({
				file,
				className,
				totalMembers: total,
				unusedMembers: unused,
				usedMembers: total - unused.length,
				lines,
				fromCache: false,
				classUnused,
			});

			if (classUnused) {
				console.log(` ENTIRE CLASS UNUSED`);
			} else {
				console.log(` ${unused.length} unused / ${total} total`);
			}
		}
	}

	saveCache(cache);

	// Summary
	console.log('\n' + '='.repeat(70));
	console.log('\nSUMMARY\n');

	if (skippedFromCache > 0) {
		console.log(`Skipped ${skippedFromCache} clean files (from cache)\n`);
	}

	// Categorize results
	const deadClasses = results.filter((r) => r.classUnused);
	const functionallyDead = results.filter(
		(r) => !r.classUnused && r.unusedMembers.length === r.totalMembers && r.totalMembers > 0,
	);
	const withUnused = results.filter(
		(r) => !r.classUnused && r.unusedMembers.length > 0 && r.unusedMembers.length < r.totalMembers,
	);
	const clean = results.filter((r) => !r.classUnused && r.unusedMembers.length === 0);

	// Report dead classes first (highest priority - entire files can be deleted)
	if (deadClasses.length > 0) {
		console.log(`\n${'!'.repeat(70)}`);
		console.log(`DEAD CLASSES - Never imported anywhere (${deadClasses.length}):\n`);
		console.log('These files can be DELETED entirely:\n');

		for (const result of deadClasses) {
			console.log(`  ${result.file} (${result.className})`);
			console.log(`    └─ ${result.totalMembers} methods, ${result.lines} lines - NEVER IMPORTED`);
		}
		console.log(`\n${'!'.repeat(70)}`);
	}

	// Report functionally dead classes (imported but ALL methods unused)
	if (functionallyDead.length > 0) {
		console.log(`\n${'?'.repeat(70)}`);
		console.log(
			`FUNCTIONALLY DEAD - Imported but NO methods ever called (${functionallyDead.length}):\n`,
		);

		for (const result of functionallyDead) {
			const propName = result.className.charAt(0).toLowerCase() + result.className.slice(1);
			console.log(`  ${result.file} (${result.className}) - ${result.lines} lines`);
			console.log(`    To remove, edit pages/n8nPage.ts:`);
			console.log(`      1. Delete: import { ${result.className} } from './${result.className}';`);
			console.log(`      2. Delete: readonly ${propName}: ${result.className};`);
			console.log(`      3. Delete: this.${propName} = new ${result.className}(page);`);
			console.log(`    Then: rm ${result.file}`);
			console.log();
		}
		console.log(`${'?'.repeat(70)}`);
	}

	if (withUnused.length === 0 && deadClasses.length === 0) {
		console.log('All analyzed files are clean.\n');
	} else if (withUnused.length > 0) {
		console.log(`\nFiles with unused methods (${withUnused.length}):\n`);

		withUnused.sort((a, b) => b.unusedMembers.length - a.unusedMembers.length);

		for (const result of withUnused) {
			console.log(
				`  ${result.file} (${result.className}): ${result.unusedMembers.length} unused / ${result.totalMembers} total`,
			);
			for (const member of result.unusedMembers) {
				console.log(`    - ${member}`);
			}
			console.log();
		}
	}

	if (clean.length > 0) {
		console.log(`Clean files (${clean.length}): ${clean.map((r) => r.file).join(', ')}\n`);
	}

	// Total stats
	const totalUnused = results.reduce((sum, r) => sum + r.unusedMembers.length, 0);
	const totalMembers = results.reduce((sum, r) => sum + r.totalMembers, 0);
	const deadClassLines = deadClasses.reduce((sum, r) => sum + r.lines, 0);
	const functionallyDeadLines = functionallyDead.reduce((sum, r) => sum + r.lines, 0);

	console.log('='.repeat(70));
	console.log(`\nTOTAL:`);
	console.log(
		`  Dead classes:           ${deadClasses.length} (${deadClassLines} lines deletable)`,
	);
	console.log(
		`  Functionally dead:      ${functionallyDead.length} (${functionallyDeadLines} lines deletable)`,
	);
	console.log(
		`  Partial unused methods: ${totalUnused - functionallyDead.reduce((s, r) => s + r.unusedMembers.length, 0)}`,
	);
	console.log(
		`  Overall usage:          ${(((totalMembers - totalUnused) / totalMembers) * 100).toFixed(1)}%`,
	);

	if (fix && (withUnused.length > 0 || deadClasses.length > 0)) {
		console.log('\n' + '='.repeat(70));
		console.log('\nFIX MODE' + (write ? ' (WRITING CHANGES)' : ' (DRY RUN)') + '\n');

		// Handle dead classes first (delete entire files)
		if (deadClasses.length > 0) {
			console.log('DELETING DEAD CLASS FILES:\n');
			for (const result of deadClasses) {
				const fullPath = path.join(__dirname, '..', result.file);
				console.log(`  DELETE: ${result.file} (${result.lines} lines)`);
				if (write) {
					fs.unlinkSync(fullPath);
					cache.delete(result.file);
				}
			}
			console.log();
		}

		// Handle files with unused methods
		for (const result of withUnused) {
			const fullPath = path.join(__dirname, '..', result.file);
			const sourceFile = project.getSourceFile(fullPath);
			if (!sourceFile) continue;

			const classDecl = sourceFile.getClass(result.className);
			if (!classDecl) continue;

			for (const memberName of result.unusedMembers) {
				const method = classDecl.getMethod(memberName);
				if (method) {
					console.log(`  Removing method: ${result.className}.${memberName}()`);
					if (write) {
						method.remove();
					}
				}

				const prop = classDecl.getProperty(memberName);
				if (prop) {
					console.log(`  Removing property: ${result.className}.${memberName}`);
					if (write) {
						prop.remove();
					}
				}
			}
		}

		if (write) {
			await project.save();
			console.log('\nChanges saved. Run tests to verify.');

			// Clear cache for modified files
			for (const result of withUnused) {
				cache.delete(result.file);
			}
			saveCache(cache);
		} else {
			console.log('\nDry run complete. Use --fix --write to apply changes.');
		}
	}
}

main().catch(console.error);
