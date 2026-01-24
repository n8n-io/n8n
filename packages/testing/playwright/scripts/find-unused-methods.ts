import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';

const targetFile = process.argv[2] || 'pages/CanvasPage.ts';
const targetClass = process.argv[3] || 'CanvasPage';

const project = new Project({
	tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
});

const sourceFile = project.getSourceFileOrThrow(targetFile);
const classDecl = sourceFile.getClassOrThrow(targetClass);

console.log(`\nAnalyzing ${targetClass} in ${targetFile}\n`);
console.log('='.repeat(60));

const results: { name: string; type: string; usages: number; locations: string[] }[] = [];

// Analyze methods
for (const method of classDecl.getMethods()) {
	const methodName = method.getName();
	const refs = method.findReferencesAsNodes();

	// Filter out: the definition itself, and references within the same file
	const externalUsages = refs.filter((ref) => {
		const refFile = ref.getSourceFile();
		// Exclude the definition itself
		if (refFile === sourceFile && ref.getStartLineNumber() === method.getStartLineNumber()) {
			return false;
		}
		// Include references from other files, or other locations in same file
		return true;
	});

	// Get unique file locations
	const locations = [
		...new Set(
			externalUsages.map((ref) => {
				const file = ref.getSourceFile().getBaseName();
				const line = ref.getStartLineNumber();
				return `${file}:${line}`;
			}),
		),
	];

	results.push({
		name: methodName,
		type: 'method',
		usages: externalUsages.length,
		locations,
	});
}

// Analyze public properties that are methods/getters
for (const prop of classDecl.getProperties()) {
	const propName = prop.getName();
	// Skip private/protected
	if (
		prop.hasModifier(SyntaxKind.PrivateKeyword) ||
		prop.hasModifier(SyntaxKind.ProtectedKeyword)
	) {
		continue;
	}

	const refs = prop.findReferencesAsNodes();
	const externalUsages = refs.filter((ref) => {
		const refFile = ref.getSourceFile();
		if (refFile === sourceFile && ref.getStartLineNumber() === prop.getStartLineNumber()) {
			return false;
		}
		return true;
	});

	const locations = [
		...new Set(
			externalUsages.map((ref) => {
				const file = ref.getSourceFile().getBaseName();
				const line = ref.getStartLineNumber();
				return `${file}:${line}`;
			}),
		),
	];

	results.push({
		name: propName,
		type: 'property',
		usages: externalUsages.length,
		locations,
	});
}

// Sort by usage count (ascending - unused first)
results.sort((a, b) => a.usages - b.usages);

// Output unused (0 references)
const unused = results.filter((r) => r.usages === 0);
const used = results.filter((r) => r.usages > 0);

console.log(`\nUNUSED (${unused.length}):\n`);
for (const item of unused) {
	console.log(`  ${item.type.padEnd(10)} ${item.name}`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`\nUSED (${used.length}):\n`);
for (const item of used.slice(0, 20)) {
	const locationPreview = item.locations.slice(0, 3).join(', ');
	const more = item.locations.length > 3 ? ` +${item.locations.length - 3} more` : '';
	console.log(`  ${String(item.usages).padStart(3)}x  ${item.name}`);
	console.log(`        └─ ${locationPreview}${more}`);
}

if (used.length > 20) {
	console.log(`\n  ... and ${used.length - 20} more used members`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`\nSUMMARY:`);
console.log(`  Total members:  ${results.length}`);
console.log(`  Used:           ${used.length}`);
console.log(`  Unused:         ${unused.length}`);
console.log(`  Usage rate:     ${((used.length / results.length) * 100).toFixed(1)}%`);
