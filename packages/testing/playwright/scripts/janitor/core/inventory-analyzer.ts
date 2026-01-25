import {
	SyntaxKind,
	type Project,
	type SourceFile,
	type ClassDeclaration,
	type MethodDeclaration,
	type PropertyDeclaration,
	type FunctionDeclaration,
} from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import { getSourceFiles } from './project-loader';
import { getConfig } from '../janitor.config';

const PLAYWRIGHT_ROOT = path.join(__dirname, '..', '..', '..');

// ============================================================================
// Types
// ============================================================================

export interface ParameterInfo {
	name: string;
	type: string;
	optional: boolean;
}

export interface MethodInfo {
	name: string;
	params: ParameterInfo[];
	returnType: string;
	async: boolean;
	description?: string;
}

export interface PropertyInfo {
	name: string;
	type: string;
	readonly: boolean;
}

export interface PageInfo {
	name: string;
	file: string;
	container: string | null;
	methods: MethodInfo[];
	properties: PropertyInfo[];
	extendsClass?: string;
}

export interface ComponentInfo extends PageInfo {
	mountedIn: string[]; // Which pages use this component
}

export interface ServiceMethodInfo extends MethodInfo {
	httpMethod?: string; // GET, POST, PUT, DELETE
	endpoint?: string; // /api/workflows
}

export interface ServiceInfo {
	name: string;
	file: string;
	methods: ServiceMethodInfo[];
}

export interface FixtureInfo {
	name: string;
	file: string;
	provides: Record<string, string>; // property name -> type
	extendsFixture?: string;
}

export interface HelperInfo {
	name: string;
	file: string;
	functions: MethodInfo[];
}

export interface FactoryInfo {
	name: string;
	file: string;
	methods: MethodInfo[];
	builds: string; // What type it builds
}

export interface ComposableInfo {
	name: string;
	file: string;
	methods: MethodInfo[];
	usesPages: string[]; // Which page objects this composable uses
}

export interface TestDataInfo {
	name: string; // Filename without extension
	file: string; // Relative path
	category: string; // Parent folder (e.g., 'workflows', 'expectations/langchain')
	sizeKb: number; // File size in KB
}

export interface Inventory {
	timestamp: string;
	summary: {
		pages: number;
		components: number;
		composables: number;
		services: number;
		fixtures: number;
		helpers: number;
		factories: number;
		testData: number;
	};
	pages: PageInfo[];
	components: ComponentInfo[];
	composables: ComposableInfo[];
	services: ServiceInfo[];
	fixtures: FixtureInfo[];
	helpers: HelperInfo[];
	factories: FactoryInfo[];
	testData: TestDataInfo[];
}

// ============================================================================
// Inventory Analyzer
// ============================================================================

export class InventoryAnalyzer {
	constructor(private project: Project) {}

	/**
	 * Generate full inventory of the playwright codebase
	 */
	analyze(): Inventory {
		const pages = this.analyzePages();
		const components = this.analyzeComponents(pages);
		const composables = this.analyzeComposables();
		const services = this.analyzeServices();
		const fixtures = this.analyzeFixtures();
		const helpers = this.analyzeHelpers();
		const factories = this.analyzeFactories();
		const testData = this.analyzeTestData();

		return {
			timestamp: new Date().toISOString(),
			summary: {
				pages: pages.length,
				components: components.length,
				composables: composables.length,
				services: services.length,
				fixtures: fixtures.length,
				helpers: helpers.length,
				factories: factories.length,
				testData: testData.length,
			},
			pages,
			components,
			composables,
			services,
			fixtures,
			helpers,
			factories,
			testData,
		};
	}

	/**
	 * Describe a single class in detail
	 */
	describe(className: string): PageInfo | ServiceInfo | HelperInfo | ComposableInfo | null {
		// Search across all categories
		const allFiles = this.project.getSourceFiles();

		for (const file of allFiles) {
			for (const classDecl of file.getClasses()) {
				if (classDecl.getName() === className) {
					const filePath = this.getRelativePath(file.getFilePath());
					const config = getConfig();

					// Check against patterns to determine type
					const matchesPattern = (patterns: string[]) =>
						patterns.some((p) => {
							const basePattern = p.replace('**/*.ts', '').replace('/**/*.ts', '');
							return filePath.startsWith(basePattern);
						});

					if (matchesPattern(config.patterns.components)) {
						return this.extractPageInfo(classDecl, file);
					} else if (matchesPattern(config.patterns.pages)) {
						return this.extractPageInfo(classDecl, file);
					} else if (matchesPattern(config.patterns.flows)) {
						return this.extractComposableInfo(classDecl, file);
					} else if (matchesPattern(config.patterns.services)) {
						return this.extractServiceInfo(classDecl, file);
					}
				}
			}
		}

		return null;
	}

	// ==========================================================================
	// Pages Analysis
	// ==========================================================================

	private analyzePages(): PageInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.pages);
		const pages: PageInfo[] = [];

		for (const file of files) {
			const filePath = this.getRelativePath(file.getFilePath());

			// Skip components and excluded files (facades, base classes)
			if (filePath.includes('/components/')) {
				continue;
			}

			// Check against exclude list
			const shouldExclude = config.excludeFromPages.some((exclude) => filePath.endsWith(exclude));
			if (shouldExclude) {
				continue;
			}

			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					pages.push(this.extractPageInfo(classDecl, file));
				}
			}
		}

		return pages.sort((a, b) => a.name.localeCompare(b.name));
	}

	private extractPageInfo(classDecl: ClassDeclaration, file: SourceFile): PageInfo {
		return {
			name: classDecl.getName() || 'Anonymous',
			file: this.getRelativePath(file.getFilePath()),
			container: this.extractContainer(classDecl),
			methods: this.extractMethods(classDecl),
			properties: this.extractProperties(classDecl),
			extendsClass: classDecl.getExtends()?.getText(),
		};
	}

	private extractContainer(classDecl: ClassDeclaration): string | null {
		// Check for container getter
		const getter = classDecl.getGetAccessor('container');
		if (getter) {
			const body = getter.getBody()?.getText() || '';
			const match = body.match(/getByTestId\(['"]([^'"]+)['"]\)/);
			return match ? `getByTestId('${match[1]}')` : 'custom';
		}

		// Check for container property
		const prop = classDecl.getProperty('container');
		if (prop) {
			const initializer = prop.getInitializer()?.getText();
			return initializer || 'defined';
		}

		// Check for getContainer method
		const method = classDecl.getMethod('getContainer');
		if (method) {
			return 'getContainer()';
		}

		return null;
	}

	// ==========================================================================
	// Components Analysis
	// ==========================================================================

	private analyzeComponents(pages: PageInfo[]): ComponentInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.components);
		const components: ComponentInfo[] = [];

		for (const file of files) {
			const filePath = this.getRelativePath(file.getFilePath());

			// Skip base classes
			if (filePath.endsWith('BaseModal.ts') || filePath.endsWith('BaseComponent.ts')) {
				continue;
			}

			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					const componentName = classDecl.getName() || '';
					const mountedIn = this.findComponentUsage(componentName, pages);

					components.push({
						...this.extractPageInfo(classDecl, file),
						mountedIn,
					});
				}
			}
		}

		return components.sort((a, b) => a.name.localeCompare(b.name));
	}

	private findComponentUsage(componentName: string, pages: PageInfo[]): string[] {
		const usedIn: string[] = [];

		// Search page files for component instantiation
		const pageFiles = getSourceFiles(this.project, ['pages/**/*.ts']);

		for (const file of pageFiles) {
			const filePath = this.getRelativePath(file.getFilePath());
			if (filePath.includes('/components/')) continue;

			const content = file.getText();

			// Look for: new ComponentName( or readonly x = new ComponentName(
			if (content.includes(`new ${componentName}(`)) {
				for (const classDecl of file.getClasses()) {
					const pageName = classDecl.getName();
					if (pageName && !usedIn.includes(pageName)) {
						usedIn.push(pageName);
					}
				}
			}
		}

		return usedIn.sort();
	}

	// ==========================================================================
	// Composables Analysis
	// ==========================================================================

	private analyzeComposables(): ComposableInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.flows);
		const composables: ComposableInfo[] = [];

		for (const file of files) {
			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					const composableInfo = this.extractComposableInfo(classDecl, file);
					composables.push(composableInfo);
				}
			}
		}

		return composables.sort((a, b) => a.name.localeCompare(b.name));
	}

	private extractComposableInfo(classDecl: ClassDeclaration, file: SourceFile): ComposableInfo {
		const methods = this.extractMethods(classDecl);
		const usesPages = this.findPageObjectUsage(classDecl);

		return {
			name: classDecl.getName() || 'Anonymous',
			file: this.getRelativePath(file.getFilePath()),
			methods,
			usesPages,
		};
	}

	/**
	 * Find which page objects a flow uses by looking for fixture usage patterns
	 */
	private findPageObjectUsage(classDecl: ClassDeclaration): string[] {
		const config = getConfig();
		const usedPages = new Set<string>();
		const content = classDecl.getText();

		// Match patterns like this.<fixture>.canvas, this.<fixture>.ndv
		const pattern = new RegExp(`this\\.${config.fixtureObjectName}\\.(\\w+)`, 'g');
		const matches = content.matchAll(pattern);

		for (const match of matches) {
			const pageName = match[1];
			// Skip 'page' as that's the raw Playwright page, not a page object
			if (pageName !== 'page') {
				usedPages.add(pageName);
			}
		}

		return Array.from(usedPages).sort();
	}

	// ==========================================================================
	// Services Analysis
	// ==========================================================================

	private analyzeServices(): ServiceInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.services);
		const services: ServiceInfo[] = [];

		for (const file of files) {
			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					services.push(this.extractServiceInfo(classDecl, file));
				}
			}
		}

		return services.sort((a, b) => a.name.localeCompare(b.name));
	}

	private extractServiceInfo(classDecl: ClassDeclaration, file: SourceFile): ServiceInfo {
		const methods = classDecl
			.getMethods()
			.filter((m) => !m.hasModifier(SyntaxKind.PrivateKeyword))
			.map((m) => this.extractServiceMethod(m));

		return {
			name: classDecl.getName() || 'Anonymous',
			file: this.getRelativePath(file.getFilePath()),
			methods,
		};
	}

	private extractServiceMethod(method: MethodDeclaration): ServiceMethodInfo {
		const name = method.getName();
		const baseInfo = this.extractMethodInfo(method);

		// Infer HTTP method from name
		const httpMethod = this.inferHttpMethod(name);

		// Try to extract endpoint from JSDoc or method body
		const endpoint = this.extractEndpoint(method);

		return {
			...baseInfo,
			httpMethod,
			endpoint,
		};
	}

	private inferHttpMethod(methodName: string): string | undefined {
		const lower = methodName.toLowerCase();
		if (lower.startsWith('get') || lower.startsWith('fetch') || lower.startsWith('list')) {
			return 'GET';
		}
		if (lower.startsWith('create') || lower.startsWith('add') || lower.startsWith('post')) {
			return 'POST';
		}
		if (lower.startsWith('update') || lower.startsWith('edit') || lower.startsWith('put')) {
			return 'PUT';
		}
		if (lower.startsWith('delete') || lower.startsWith('remove')) {
			return 'DELETE';
		}
		return undefined;
	}

	private extractEndpoint(method: MethodDeclaration): string | undefined {
		// Check JSDoc for @endpoint tag
		const jsDocs = method.getJsDocs();
		for (const doc of jsDocs) {
			const text = doc.getText();
			const match = text.match(/@endpoint\s+(\S+)/);
			if (match) return match[1];
		}

		// Try to find URL pattern in method body
		const body = method.getBody()?.getText() || '';
		const urlMatch = body.match(/['"`](\/api\/[^'"`]+)['"`]/);
		if (urlMatch) return urlMatch[1];

		return undefined;
	}

	// ==========================================================================
	// Fixtures Analysis
	// ==========================================================================

	private analyzeFixtures(): FixtureInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.fixtures);
		const fixtures: FixtureInfo[] = [];

		for (const file of files) {
			const filePath = this.getRelativePath(file.getFilePath());

			// Look for test.extend calls
			const extendCalls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of extendCalls) {
				const expr = call.getExpression().getText();
				if (expr.endsWith('.extend')) {
					const fixtureInfo = this.extractFixtureInfo(call, file);
					if (fixtureInfo) {
						fixtures.push(fixtureInfo);
					}
				}
			}

			// Also look for exported fixture objects/classes
			for (const varDecl of file.getVariableDeclarations()) {
				if (varDecl.isExported() && varDecl.getName().toLowerCase().includes('fixture')) {
					fixtures.push({
						name: varDecl.getName(),
						file: filePath,
						provides: {},
					});
				}
			}
		}

		return fixtures;
	}

	private extractFixtureInfo(
		call: ReturnType<SourceFile['getDescendantsOfKind']>[0],
		file: SourceFile,
	): FixtureInfo | null {
		const args = call.getArguments();
		if (args.length === 0) return null;

		const firstArg = args[0];
		const provides: Record<string, string> = {};

		// Extract properties from the fixture definition object
		if (firstArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
			const objLit = firstArg.asKind(SyntaxKind.ObjectLiteralExpression);
			for (const prop of objLit?.getProperties() || []) {
				if (prop.getKind() === SyntaxKind.PropertyAssignment) {
					const propAssign = prop.asKind(SyntaxKind.PropertyAssignment);
					const name = propAssign?.getName() || '';
					// Try to infer type from initializer
					const init = propAssign?.getInitializer()?.getText() || '';
					provides[name] = this.inferFixtureType(init);
				}
			}
		}

		return {
			name: 'test', // Standard Playwright fixture name
			file: this.getRelativePath(file.getFilePath()),
			provides,
		};
	}

	private inferFixtureType(initializerText: string): string {
		// Try to extract type from: async ({}, use) => { ... new SomeClass() }
		const newMatch = initializerText.match(/new\s+(\w+)/);
		if (newMatch) return newMatch[1];

		return 'unknown';
	}

	// ==========================================================================
	// Helpers Analysis
	// ==========================================================================

	private analyzeHelpers(): HelperInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.helpers);
		const helpers: HelperInfo[] = [];

		for (const file of files) {
			const functions: MethodInfo[] = [];

			// Extract standalone functions
			for (const func of file.getFunctions()) {
				if (func.isExported()) {
					functions.push(this.extractFunctionInfo(func));
				}
			}

			// Extract class methods
			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					const methods = this.extractMethods(classDecl);
					functions.push(...methods);
				}
			}

			if (functions.length > 0) {
				helpers.push({
					name: this.getClassName(file) || path.basename(file.getFilePath(), '.ts'),
					file: this.getRelativePath(file.getFilePath()),
					functions,
				});
			}
		}

		return helpers.sort((a, b) => a.name.localeCompare(b.name));
	}

	private getClassName(file: SourceFile): string | undefined {
		const classes = file.getClasses();
		return classes[0]?.getName();
	}

	private extractFunctionInfo(func: FunctionDeclaration): MethodInfo {
		return {
			name: func.getName() || 'anonymous',
			params: func.getParameters().map((p) => ({
				name: p.getName(),
				type: this.simplifyType(p.getType().getText()),
				optional: p.isOptional(),
			})),
			returnType: this.simplifyType(func.getReturnType().getText()),
			async: func.isAsync(),
			description: this.extractJsDocDescription(func),
		};
	}

	// ==========================================================================
	// Factories / Test Data Analysis
	// ==========================================================================

	private analyzeFactories(): FactoryInfo[] {
		const config = getConfig();
		const patterns = config.patterns.factories;
		const files = getSourceFiles(this.project, patterns);
		const factories: FactoryInfo[] = [];

		for (const file of files) {
			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					const name = classDecl.getName() || '';
					const methods = this.extractMethods(classDecl);

					// Try to infer what type this factory builds
					const builds = this.inferFactoryProduct(classDecl);

					factories.push({
						name,
						file: this.getRelativePath(file.getFilePath()),
						methods,
						builds,
					});
				}
			}

			// Also check for factory functions
			for (const func of file.getFunctions()) {
				if (func.isExported() && func.getName()?.toLowerCase().includes('factory')) {
					factories.push({
						name: func.getName() || 'anonymous',
						file: this.getRelativePath(file.getFilePath()),
						methods: [this.extractFunctionInfo(func)],
						builds: this.simplifyType(func.getReturnType().getText()),
					});
				}
			}
		}

		return factories.sort((a, b) => a.name.localeCompare(b.name));
	}

	private inferFactoryProduct(classDecl: ClassDeclaration): string {
		// Check build() method return type
		const buildMethod = classDecl.getMethod('build') || classDecl.getMethod('create');
		if (buildMethod) {
			return this.simplifyType(buildMethod.getReturnType().getText());
		}

		// Infer from class name: WorkflowFactory -> Workflow
		const name = classDecl.getName() || '';
		if (name.endsWith('Factory')) {
			return name.replace('Factory', '');
		}
		if (name.endsWith('Builder')) {
			return name.replace('Builder', '');
		}

		return 'unknown';
	}

	// ==========================================================================
	// Test Data Analysis
	// ==========================================================================

	private analyzeTestData(): TestDataInfo[] {
		const config = getConfig();
		const testData: TestDataInfo[] = [];

		for (const pattern of config.patterns.testData) {
			const files = glob.sync(pattern, { cwd: PLAYWRIGHT_ROOT, nodir: true });

			for (const file of files) {
				const absolutePath = path.join(PLAYWRIGHT_ROOT, file);
				const stats = fs.statSync(absolutePath);
				const ext = path.extname(file);
				const name = path.basename(file, ext);
				const category = path.dirname(file);

				testData.push({
					name: ext ? `${name}${ext}` : name, // Keep extension for clarity
					file,
					category,
					sizeKb: Math.round((stats.size / 1024) * 10) / 10,
				});
			}
		}

		return testData.sort((a, b) => a.name.localeCompare(b.name));
	}

	// ==========================================================================
	// Shared Extraction Helpers
	// ==========================================================================

	private extractMethods(classDecl: ClassDeclaration): MethodInfo[] {
		return classDecl
			.getMethods()
			.filter((m) => !m.hasModifier(SyntaxKind.PrivateKeyword))
			.map((m) => this.extractMethodInfo(m));
	}

	private extractMethodInfo(method: MethodDeclaration): MethodInfo {
		return {
			name: method.getName(),
			params: method.getParameters().map((p) => ({
				name: p.getName(),
				type: this.simplifyType(p.getType().getText()),
				optional: p.isOptional(),
			})),
			returnType: this.simplifyType(method.getReturnType().getText()),
			async: method.isAsync(),
			description: this.extractJsDocDescription(method),
		};
	}

	private extractProperties(classDecl: ClassDeclaration): PropertyInfo[] {
		const properties: PropertyInfo[] = [];

		// Regular properties
		for (const prop of classDecl.getProperties()) {
			if (!prop.hasModifier(SyntaxKind.PrivateKeyword)) {
				properties.push(this.extractPropertyInfo(prop));
			}
		}

		// Getters (treated as readonly properties)
		for (const getter of classDecl.getGetAccessors()) {
			if (!getter.hasModifier(SyntaxKind.PrivateKeyword)) {
				properties.push({
					name: getter.getName(),
					type: this.simplifyType(getter.getReturnType().getText()),
					readonly: true,
				});
			}
		}

		return properties;
	}

	private extractPropertyInfo(prop: PropertyDeclaration): PropertyInfo {
		return {
			name: prop.getName(),
			type: this.simplifyType(prop.getType().getText()),
			readonly: prop.hasModifier(SyntaxKind.ReadonlyKeyword),
		};
	}

	private extractJsDocDescription(
		node: MethodDeclaration | FunctionDeclaration,
	): string | undefined {
		const jsDocs = node.getJsDocs();
		if (jsDocs.length === 0) return undefined;

		const description = jsDocs[0].getDescription();
		return description?.trim() || undefined;
	}

	private simplifyType(type: string): string {
		// Remove import paths: import("./types").Workflow -> Workflow
		let simplified = type.replace(/import\([^)]+\)\./g, '');

		// Simplify Promise<T> -> T (for display)
		simplified = simplified.replace(/Promise<(.+)>/, '$1');

		// Truncate very long types
		if (simplified.length > 50) {
			simplified = simplified.slice(0, 47) + '...';
		}

		return simplified;
	}

	private getRelativePath(absolutePath: string): string {
		return path.relative(PLAYWRIGHT_ROOT, absolutePath);
	}
}

// ============================================================================
// Output Formatters
// ============================================================================

export function formatInventoryConsole(inventory: Inventory, verbose = false): void {
	console.log('\n====================================');
	console.log('      PLAYWRIGHT INVENTORY');
	console.log('====================================\n');

	console.log('Summary:');
	console.log(`  Pages:       ${inventory.summary.pages}`);
	console.log(`  Components:  ${inventory.summary.components}`);
	console.log(`  Composables: ${inventory.summary.composables}`);
	console.log(`  Services:    ${inventory.summary.services}`);
	console.log(`  Fixtures:    ${inventory.summary.fixtures}`);
	console.log(`  Helpers:     ${inventory.summary.helpers}`);
	console.log(`  Factories:   ${inventory.summary.factories}`);
	console.log(`  Test Data:   ${inventory.summary.testData}`);

	if (verbose) {
		console.log('\n--- Pages ---');
		for (const page of inventory.pages) {
			const container = page.container ? `✓ ${page.container}` : '✗ missing';
			console.log(`  ${page.name} (${page.methods.length} methods) [container: ${container}]`);
		}

		console.log('\n--- Components ---');
		for (const comp of inventory.components) {
			const usedIn = comp.mountedIn.length > 0 ? comp.mountedIn.join(', ') : 'unused';
			console.log(`  ${comp.name} → used in: ${usedIn}`);
		}

		console.log('\n--- Composables ---');
		for (const comp of inventory.composables) {
			const usesPages = comp.usesPages.length > 0 ? comp.usesPages.join(', ') : 'none';
			console.log(`  ${comp.name} (${comp.methods.length} methods) → uses: ${usesPages}`);
		}

		console.log('\n--- Services ---');
		for (const svc of inventory.services) {
			console.log(`  ${svc.name} (${svc.methods.length} methods)`);
			for (const m of svc.methods.slice(0, 5)) {
				const http = m.httpMethod ? `[${m.httpMethod}]` : '';
				const endpoint = m.endpoint ? ` ${m.endpoint}` : '';
				console.log(`    .${m.name}() ${http}${endpoint}`);
			}
			if (svc.methods.length > 5) {
				console.log(`    ... and ${svc.methods.length - 5} more`);
			}
		}
	}

	console.log('');
}

export function formatInventoryJSON(inventory: Inventory): string {
	return JSON.stringify(inventory, null, 2);
}

export function formatDescribeConsole(
	info: PageInfo | ServiceInfo | HelperInfo | ComposableInfo,
): void {
	console.log(`\n${info.name}`);
	console.log(`File: ${info.file}`);

	if ('container' in info) {
		const page = info as PageInfo;
		console.log(`Container: ${page.container || 'MISSING'}`);
		if (page.extendsClass) {
			console.log(`Extends: ${page.extendsClass}`);
		}

		if (page.properties.length > 0) {
			console.log('\nProperties:');
			for (const prop of page.properties) {
				const ro = prop.readonly ? 'readonly ' : '';
				console.log(`  ${ro}${prop.name}: ${prop.type}`);
			}
		}
	}

	if ('usesPages' in info) {
		const composable = info as ComposableInfo;
		if (composable.usesPages.length > 0) {
			console.log(`Uses Pages: ${composable.usesPages.join(', ')}`);
		}
	}

	const methods = 'methods' in info ? info.methods : 'functions' in info ? info.functions : [];

	if (methods.length > 0) {
		console.log('\nMethods:');
		for (const m of methods) {
			const params = m.params.map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ');
			const asyncPrefix = m.async ? 'async ' : '';
			console.log(`  ${asyncPrefix}${m.name}(${params}): ${m.returnType}`);
			if (m.description) {
				console.log(`    └─ ${m.description}`);
			}
		}
	}

	console.log('');
}

/**
 * Format as compact list (for --list-pages, --list-services, etc.)
 */
export function formatListConsole(
	items: Array<{ name: string; file: string }>,
	category: string,
): void {
	console.log(`\n${category} (${items.length}):\n`);
	for (const item of items) {
		console.log(`  ${item.name.padEnd(30)} ${item.file}`);
	}
	console.log('');
}

/**
 * Format test data files grouped by category
 */
export function formatTestDataConsole(items: TestDataInfo[]): void {
	console.log(`\nTest Data (${items.length} files):\n`);

	// Group by category
	const byCategory = new Map<string, TestDataInfo[]>();
	for (const item of items) {
		const existing = byCategory.get(item.category) || [];
		existing.push(item);
		byCategory.set(item.category, existing);
	}

	// Sort categories
	const sortedCategories = Array.from(byCategory.keys()).sort();

	for (const category of sortedCategories) {
		const files = byCategory.get(category)!;
		console.log(`  ${category}/ (${files.length} files)`);
		for (const file of files.slice(0, 10)) {
			const size = file.sizeKb > 0 ? ` (${file.sizeKb}KB)` : '';
			console.log(`    ${file.name}${size}`);
		}
		if (files.length > 10) {
			console.log(`    ... and ${files.length - 10} more`);
		}
		console.log('');
	}
}
