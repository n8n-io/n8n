/**
 * Inventory Analyzer - Generates inventory of Playwright test codebase
 */

import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	SyntaxKind,
	type Project,
	type SourceFile,
	type ClassDeclaration,
	type MethodDeclaration,
	type PropertyDeclaration,
	type FunctionDeclaration,
	type CallExpression,
} from 'ts-morph';

import { getConfig } from '../config.js';
import { FacadeResolver } from './facade-resolver.js';
import { getSourceFiles } from './project-loader.js';
import { getRootDir, getRelativePath } from '../utils/paths.js';

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
	mountedIn: string[];
}

export interface ServiceMethodInfo extends MethodInfo {
	httpMethod?: string;
	endpoint?: string;
}

export interface ServiceInfo {
	name: string;
	file: string;
	methods: ServiceMethodInfo[];
}

export interface FixtureInfo {
	name: string;
	file: string;
	provides: Record<string, string>;
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
	builds: string;
}

export interface ComposableInfo {
	name: string;
	file: string;
	methods: MethodInfo[];
	usesPages: string[];
}

export interface TestDataInfo {
	name: string;
	file: string;
	category: string;
	sizeKb: number;
}

export interface FacadePropertyInfo {
	property: string;
	type: string;
}

export interface FacadeInfo {
	file: string;
	className: string;
	exposedPages: FacadePropertyInfo[];
	unexposedPages: string[];
}

export interface InventoryReport {
	timestamp: string;
	rootDir: string;
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
	facade: FacadeInfo | null;
	pages: PageInfo[];
	components: ComponentInfo[];
	composables: ComposableInfo[];
	services: ServiceInfo[];
	fixtures: FixtureInfo[];
	helpers: HelperInfo[];
	factories: FactoryInfo[];
	testData: TestDataInfo[];
}

/** Compact summary for AI consumption - minimal tokens */
export interface InventorySummary {
	counts: {
		pages: number;
		components: number;
		composables: number;
		services: number;
		helpers: number;
		testData: number;
	};
	facade: string[] | null;
	categories: string[];
}

export type InventoryCategory =
	| 'pages'
	| 'components'
	| 'composables'
	| 'services'
	| 'fixtures'
	| 'helpers'
	| 'factories'
	| 'testData';

/** Filtered view of a single category - method names only */
export interface InventoryCategoryView {
	category: InventoryCategory;
	items: Array<{
		name: string;
		file: string;
		methods?: string[];
	}>;
}

export class InventoryAnalyzer {
	private root: string;
	private facade: FacadeResolver;

	constructor(private project: Project) {
		this.root = getRootDir();
		this.facade = new FacadeResolver(project);
	}

	generate(): InventoryReport {
		const pages = this.analyzePages();
		const components = this.analyzeComponents(pages);
		const composables = this.analyzeComposables();
		const services = this.analyzeServices();
		const fixtures = this.analyzeFixtures();
		const helpers = this.analyzeHelpers();
		const factories = this.analyzeFactories();
		const testData = this.analyzeTestData();
		const facade = this.analyzeFacade(pages);

		return {
			timestamp: new Date().toISOString(),
			rootDir: this.root,
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
			facade,
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

	private analyzePages(): PageInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.pages);
		const pages: PageInfo[] = [];

		for (const file of files) {
			const filePath = getRelativePath(file.getFilePath());

			if (filePath.includes('/components/')) continue;

			const shouldExclude = config.excludeFromPages.some((exclude) => filePath.endsWith(exclude));
			if (shouldExclude) continue;

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
			name: classDecl.getName() ?? 'Anonymous',
			file: getRelativePath(file.getFilePath()),
			container: this.extractContainer(classDecl),
			methods: this.extractMethods(classDecl),
			properties: this.extractProperties(classDecl),
			extendsClass: classDecl.getExtends()?.getText(),
		};
	}

	private extractContainer(classDecl: ClassDeclaration): string | null {
		const getter = classDecl.getGetAccessor('container');
		if (getter) {
			const body = getter.getBody()?.getText() ?? '';
			const containerPattern = /getByTestId\(['"]([^'"]+)['"]\)/;
			const match = containerPattern.exec(body);
			return match ? `getByTestId('${match[1]}')` : 'custom';
		}

		const prop = classDecl.getProperty('container');
		if (prop) {
			const initializer = prop.getInitializer()?.getText();
			return initializer ?? 'defined';
		}

		const method = classDecl.getMethod('getContainer');
		if (method) return 'getContainer()';

		return null;
	}

	private analyzeComponents(_pages: PageInfo[]): ComponentInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.components);
		const components: ComponentInfo[] = [];

		for (const file of files) {
			const filePath = getRelativePath(file.getFilePath());

			if (filePath.endsWith('BaseModal.ts') || filePath.endsWith('BaseComponent.ts')) continue;

			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					const componentName = classDecl.getName() ?? '';
					const mountedIn = this.findComponentUsage(componentName);

					components.push({
						...this.extractPageInfo(classDecl, file),
						mountedIn,
					});
				}
			}
		}

		return components.sort((a, b) => a.name.localeCompare(b.name));
	}

	private findComponentUsage(componentName: string): string[] {
		const config = getConfig();
		const usedIn: string[] = [];
		const pageFiles = getSourceFiles(this.project, config.patterns.pages);

		for (const file of pageFiles) {
			const filePath = getRelativePath(file.getFilePath());
			if (filePath.includes('/components/')) continue;

			const content = file.getText();

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
		return {
			name: classDecl.getName() ?? 'Anonymous',
			file: getRelativePath(file.getFilePath()),
			methods: this.extractMethods(classDecl),
			usesPages: this.findPageObjectUsage(classDecl),
		};
	}

	private findPageObjectUsage(classDecl: ClassDeclaration): string[] {
		const config = getConfig();
		const usedPages = new Set<string>();
		const content = classDecl.getText();

		const pattern = new RegExp(`this\\.${config.fixtureObjectName}\\.(\\w+)`, 'g');
		const matches = content.matchAll(pattern);

		for (const match of matches) {
			const pageName = match[1];
			// 'page' is raw Playwright, not a page object
			if (pageName !== 'page') {
				usedPages.add(pageName);
			}
		}

		return Array.from(usedPages).sort();
	}

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
			name: classDecl.getName() ?? 'Anonymous',
			file: getRelativePath(file.getFilePath()),
			methods,
		};
	}

	private extractServiceMethod(method: MethodDeclaration): ServiceMethodInfo {
		const name = method.getName();
		const baseInfo = this.extractMethodInfo(method);
		const httpMethod = this.inferHttpMethod(name);
		const endpoint = this.extractEndpoint(method);

		return { ...baseInfo, httpMethod, endpoint };
	}

	private inferHttpMethod(methodName: string): string | undefined {
		const lower = methodName.toLowerCase();
		if (lower.startsWith('get') || lower.startsWith('fetch') || lower.startsWith('list'))
			return 'GET';
		if (lower.startsWith('create') || lower.startsWith('add') || lower.startsWith('post'))
			return 'POST';
		if (lower.startsWith('update') || lower.startsWith('edit') || lower.startsWith('put'))
			return 'PUT';
		if (lower.startsWith('delete') || lower.startsWith('remove')) return 'DELETE';
		return undefined;
	}

	private extractEndpoint(method: MethodDeclaration): string | undefined {
		const jsDocs = method.getJsDocs();
		const endpointPattern = /@endpoint\s+(\S+)/;
		for (const doc of jsDocs) {
			const text = doc.getText();
			const match = endpointPattern.exec(text);
			if (match) return match[1];
		}

		const body = method.getBody()?.getText() ?? '';
		const urlPattern = /['"`](\/api\/[^'"`]+)['"`]/;
		const urlMatch = urlPattern.exec(body);
		if (urlMatch) return urlMatch[1];

		return undefined;
	}

	private analyzeFixtures(): FixtureInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.fixtures);
		const fixtures: FixtureInfo[] = [];

		for (const file of files) {
			const filePath = getRelativePath(file.getFilePath());
			const extendCalls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of extendCalls) {
				const expr = call.getExpression().getText();
				if (expr.endsWith('.extend')) {
					const fixtureInfo = this.extractFixtureInfo(call, file);
					if (fixtureInfo) fixtures.push(fixtureInfo);
				}
			}

			for (const varDecl of file.getVariableDeclarations()) {
				if (varDecl.isExported() && varDecl.getName().toLowerCase().includes('fixture')) {
					fixtures.push({ name: varDecl.getName(), file: filePath, provides: {} });
				}
			}
		}

		return fixtures;
	}

	private extractFixtureInfo(call: CallExpression, file: SourceFile): FixtureInfo | null {
		const args = call.getArguments();
		if (args.length === 0) return null;

		const firstArg = args[0];
		const provides: Record<string, string> = {};

		if (firstArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
			const objLit = firstArg.asKind(SyntaxKind.ObjectLiteralExpression);
			for (const prop of objLit?.getProperties() ?? []) {
				if (prop.getKind() === SyntaxKind.PropertyAssignment) {
					const propAssign = prop.asKind(SyntaxKind.PropertyAssignment);
					const name = propAssign?.getName() ?? '';
					const init = propAssign?.getInitializer()?.getText() ?? '';
					provides[name] = this.inferFixtureType(init);
				}
			}
		}

		return { name: 'test', file: getRelativePath(file.getFilePath()), provides };
	}

	private inferFixtureType(initializerText: string): string {
		const newPattern = /new\s+(\w+)/;
		const newMatch = newPattern.exec(initializerText);
		if (newMatch) return newMatch[1];
		return 'unknown';
	}

	private analyzeHelpers(): HelperInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.helpers);
		const helpers: HelperInfo[] = [];

		for (const file of files) {
			const functions: MethodInfo[] = [];

			for (const func of file.getFunctions()) {
				if (func.isExported()) {
					functions.push(this.extractFunctionInfo(func));
				}
			}

			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					functions.push(...this.extractMethods(classDecl));
				}
			}

			if (functions.length > 0) {
				helpers.push({
					name: this.getClassName(file) ?? path.basename(file.getFilePath(), '.ts'),
					file: getRelativePath(file.getFilePath()),
					functions,
				});
			}
		}

		return helpers.sort((a, b) => a.name.localeCompare(b.name));
	}

	private getClassName(file: SourceFile): string | undefined {
		return file.getClasses()[0]?.getName();
	}

	private extractFunctionInfo(func: FunctionDeclaration): MethodInfo {
		return {
			name: func.getName() ?? 'anonymous',
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

	private analyzeFactories(): FactoryInfo[] {
		const config = getConfig();
		const files = getSourceFiles(this.project, config.patterns.factories);
		const factories: FactoryInfo[] = [];

		for (const file of files) {
			for (const classDecl of file.getClasses()) {
				if (classDecl.isExported()) {
					const name = classDecl.getName() ?? '';
					factories.push({
						name,
						file: getRelativePath(file.getFilePath()),
						methods: this.extractMethods(classDecl),
						builds: this.inferFactoryProduct(classDecl),
					});
				}
			}

			for (const func of file.getFunctions()) {
				if (func.isExported() && func.getName()?.toLowerCase().includes('factory')) {
					factories.push({
						name: func.getName() ?? 'anonymous',
						file: getRelativePath(file.getFilePath()),
						methods: [this.extractFunctionInfo(func)],
						builds: this.simplifyType(func.getReturnType().getText()),
					});
				}
			}
		}

		return factories.sort((a, b) => a.name.localeCompare(b.name));
	}

	private inferFactoryProduct(classDecl: ClassDeclaration): string {
		const buildMethod = classDecl.getMethod('build') ?? classDecl.getMethod('create');
		if (buildMethod) return this.simplifyType(buildMethod.getReturnType().getText());

		const name = classDecl.getName() ?? '';
		if (name.endsWith('Factory')) return name.replace('Factory', '');
		if (name.endsWith('Builder')) return name.replace('Builder', '');

		return 'unknown';
	}

	private analyzeTestData(): TestDataInfo[] {
		const config = getConfig();
		const testData: TestDataInfo[] = [];

		for (const pattern of config.patterns.testData) {
			try {
				const files = glob.sync(pattern, { cwd: this.root, nodir: true });

				for (const file of files) {
					const absolutePath = path.join(this.root, file);
					try {
						const stats = fs.statSync(absolutePath);
						testData.push({
							name: path.basename(file),
							file,
							category: path.dirname(file),
							sizeKb: Math.round((stats.size / 1024) * 10) / 10,
						});
					} catch {
						// Skip files that can't be read
					}
				}
			} catch {
				// Skip patterns that fail
			}
		}

		return testData.sort((a, b) => a.name.localeCompare(b.name));
	}

	private analyzeFacade(pages: PageInfo[]): FacadeInfo | null {
		const config = getConfig();
		const classToPropertyMap = this.facade.getClassToPropertyMap();

		// No facade configured or found
		if (classToPropertyMap.size === 0) {
			return null;
		}

		// Build exposed pages from facade resolver
		const exposedPages: FacadePropertyInfo[] = [];
		const exposedTypes = new Set<string>();

		for (const [className, properties] of classToPropertyMap) {
			exposedTypes.add(className);
			for (const property of properties) {
				exposedPages.push({ property, type: className });
			}
		}

		// Find pages not exposed on the facade
		const unexposedPages = pages
			.filter((page) => !exposedTypes.has(page.name))
			.map((page) => page.name)
			.sort();

		return {
			file: config.facade.file,
			className: config.facade.className,
			exposedPages: exposedPages.sort((a, b) => a.property.localeCompare(b.property)),
			unexposedPages,
		};
	}

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

		for (const prop of classDecl.getProperties()) {
			if (!prop.hasModifier(SyntaxKind.PrivateKeyword)) {
				properties.push(this.extractPropertyInfo(prop));
			}
		}

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
		return jsDocs[0].getDescription()?.trim() || undefined;
	}

	private simplifyType(type: string): string {
		let simplified = type.replace(/import\([^)]+\)\./g, '');
		simplified = simplified.replace(/Promise<(.+)>/, '$1');
		if (simplified.length > 50) simplified = simplified.slice(0, 47) + '...';
		return simplified;
	}
}

export function formatInventoryJSON(inventory: InventoryReport): string {
	return JSON.stringify(inventory, null, 2);
}

export function formatInventorySummaryJSON(summary: InventorySummary): string {
	return JSON.stringify(summary, null, 2);
}

export function formatInventoryCategoryJSON(view: InventoryCategoryView): string {
	return JSON.stringify(view, null, 2);
}

/** Extract compact summary from full report */
export function toSummary(report: InventoryReport): InventorySummary {
	return {
		counts: {
			pages: report.summary.pages,
			components: report.summary.components,
			composables: report.summary.composables,
			services: report.summary.services,
			helpers: report.summary.helpers,
			testData: report.summary.testData,
		},
		facade: report.facade?.exposedPages.map((p) => p.property) ?? null,
		categories: ['pages', 'components', 'composables', 'services', 'helpers', 'testData'],
	};
}

/** Extract single category with method names only */
export function toCategory(
	report: InventoryReport,
	category: InventoryCategory,
): InventoryCategoryView {
	const extractMethods = (
		items: Array<{ name: string; file: string; methods?: MethodInfo[] }>,
	): InventoryCategoryView['items'] =>
		items.map((item) => ({
			name: item.name,
			file: item.file,
			methods: item.methods?.map((m) => m.name),
		}));

	switch (category) {
		case 'pages':
			return { category, items: extractMethods(report.pages) };
		case 'components':
			return { category, items: extractMethods(report.components) };
		case 'composables':
			return { category, items: extractMethods(report.composables) };
		case 'services':
			return { category, items: extractMethods(report.services) };
		case 'helpers':
			return {
				category,
				items: report.helpers.map((h) => ({
					name: h.name,
					file: h.file,
					methods: h.functions.map((f) => f.name),
				})),
			};
		case 'fixtures':
			return {
				category,
				items: report.fixtures.map((f) => ({ name: f.name, file: f.file })),
			};
		case 'factories':
			return { category, items: extractMethods(report.factories) };
		case 'testData':
			return {
				category,
				items: report.testData.map((t) => ({ name: t.name, file: t.file })),
			};
	}
}

/** All possible return types from filterByFile */
export type InventoryItem =
	| PageInfo
	| ComponentInfo
	| ComposableInfo
	| ServiceInfo
	| HelperInfo
	| FixtureInfo
	| FactoryInfo
	| TestDataInfo;

/** Filter report to single file - returns detailed info for that file only */
export function filterByFile(report: InventoryReport, fileName: string): InventoryItem | null {
	const normalizedName = fileName
		.replace(/^.*\//, '')
		.replace(/\.ts$/, '')
		.replace(/\.json$/, '');

	const collections: Array<{ items: Array<{ name: string; file: string }> }> = [
		{ items: report.pages },
		{ items: report.components },
		{ items: report.composables },
		{ items: report.services },
		{ items: report.helpers },
		{ items: report.fixtures },
		{ items: report.factories },
		{ items: report.testData },
	];

	for (const { items } of collections) {
		for (const item of items) {
			if (item.file.includes(fileName) || item.name === normalizedName) {
				return item as InventoryItem;
			}
		}
	}

	return null;
}
