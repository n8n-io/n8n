import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import { globSync } from 'glob';
import * as fs from 'node:fs';
import {
	SyntaxKind,
	type ClassDeclaration,
	type MethodDeclaration,
	type Project,
	type PropertyDeclaration,
	type SourceFile,
} from 'ts-morph';

import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { matchesPatterns } from '../utils/paths.js';

/** Public member and class names declared across the target files. */
type DeclaredNames = { members: Set<string>; classes: Set<string> };

/**
 * Names found referenced across the suite text:
 * - `members`: member names that appear as a `.name` access anywhere.
 * - `classes`: class names that appear more than once (the declaration itself is
 *   one occurrence, so a second occurrence means the class is referenced).
 */
interface UsageIndex {
	members: Set<string>;
	classes: Set<string>;
}

/**
 * Dead Code Rule
 *
 * Finds unused methods, properties, and classes.
 *
 * Detects:
 * - Unused public methods (never called anywhere)
 * - Unused public properties (never accessed anywhere)
 * - Dead classes (class name never referenced beyond its own declaration)
 *
 * Usage is traced from the raw text of the suite, not the ts-morph language
 * service. `findReferences` forces ts-morph to build a fully type-checked
 * program over the whole import closure (n8n-workflow + node_modules), and
 * loading every spec as an AST just to read it costs multiple GB — together
 * that needed ~10GB of heap and minutes for this suite. Instead only the
 * declaration files (pages/flows/helpers/services) are parsed into an AST; the
 * whole suite (including those declaration files themselves) is then scanned as
 * plain text so a member used only from another page still counts.
 *
 * A member is "used" if `.name` appears anywhere; a class if its name appears
 * beyond its own declaration. This is a name-based heuristic, and deliberately
 * errs towards NOT flagging (a false positive here would auto-delete live code
 * under `--fix`). Known blind spots, all of which only cause under-reporting:
 * - it matches by name, not resolved symbol, so it cannot tell same-named
 *   members/classes on different files apart: once any `goto()` is called, no
 *   other `goto()` in the suite can be flagged. Shared conventional verb names
 *   (goto/open/close/search) are effectively never flagged.
 * - it does not strip comments or strings, so a name mentioned in a JSDoc
 *   `@example`, doc comment, or `getByTestId('...')` string counts as a use.
 * Members reached only by computed/bracket access (`obj['m']`) or destructuring
 * are the one theoretical false-positive seam; none exist in the suite today.
 */
export class DeadCodeRule extends AstRule<{ rootDir: string }> {
	readonly id = 'dead-code';
	readonly name = 'Dead Code';
	readonly description = 'Find unused methods, properties, and classes';
	readonly severity = 'warning' as const;

	private usage: UsageIndex = { members: new Set(), classes: new Set() };

	getTargetGlobs(): string[] {
		const config = getConfig();
		return [
			...config.patterns.pages,
			...config.patterns.flows,
			...config.patterns.helpers,
			...config.patterns.services,
		];
	}

	protected projectConfig(): AstProjectConfig {
		// Only the declaration files need an AST (to enumerate classes and their
		// members). Usage across the whole suite is traced from raw text below, so
		// we neither load every spec as an AST nor resolve dependencies.
		return {
			packages: ['.'],
			spec: { globs: [...this.getTargetGlobs(), '!**/*.d.ts'], resolveDependencies: false },
		};
	}

	analyze(context: { rootDir: string }): Violation[] {
		return this.projects(context).flatMap(({ project }) =>
			this.findDeadCode(this.declarationFiles(project), this.readSuiteCorpus(context.rootDir)),
		);
	}

	/**
	 * Test seam: declarations come from `files`, usage from the (in-memory)
	 * project's own source files.
	 */
	analyzeProject(
		project: Project,
		files: SourceFile[] = this.declarationFiles(project),
	): Violation[] {
		const corpus = project.getSourceFiles().map((f) => f.getFullText());
		return this.findDeadCode(files, corpus);
	}

	/** Source files that declare the artifacts this rule checks (pages/flows/helpers/services). */
	private declarationFiles(project: Project): SourceFile[] {
		return project
			.getSourceFiles()
			.filter((f) => matchesPatterns(f.getFilePath(), this.getTargetGlobs()));
	}

	private findDeadCode(files: SourceFile[], corpus: Iterable<string>): Violation[] {
		this.usage = this.buildUsageIndex(corpus, this.collectDeclaredNames(files));

		const violations: Violation[] = [];
		for (const file of files) {
			violations.push(...this.analyzeFile(file));
		}
		return violations;
	}

	/**
	 * Yield every non-declaration `.ts` file in the suite as plain text, one at a
	 * time. Streaming (read -> scan -> discard) keeps peak memory at a single
	 * file rather than holding the whole suite's text at once.
	 */
	private *readSuiteCorpus(rootDir: string): Iterable<string> {
		const paths = globSync('**/*.ts', {
			cwd: rootDir,
			absolute: true,
			ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
		});
		for (const p of paths) {
			yield fs.readFileSync(p, 'utf8');
		}
	}

	/**
	 * Names declared across the target files. Methods are candidates unless
	 * `private`/`#private`; properties also exclude `protected`.
	 */
	private collectDeclaredNames(files: SourceFile[]): DeclaredNames {
		const members = new Set<string>();
		const classes = new Set<string>();

		for (const file of files) {
			for (const classDecl of file.getClasses()) {
				const className = classDecl.getName();
				if (className) classes.add(className);

				for (const method of classDecl.getMethods()) {
					if (this.shouldCheckMethod(method)) members.add(method.getName());
				}
				for (const prop of classDecl.getProperties()) {
					if (this.shouldCheckProperty(prop)) members.add(prop.getName());
				}
			}
		}

		return { members, classes };
	}

	/**
	 * Single pass over the corpus with one regex: an identifier, optionally
	 * preceded by a dot. A dotted identifier is a `.name` access -> marks the
	 * member used; every identifier occurrence counts toward its class, which is
	 * "used" once seen beyond its single declaration occurrence. Storage is
	 * bounded to declared names, so the index stays small.
	 */
	private buildUsageIndex(corpus: Iterable<string>, declared: DeclaredNames): UsageIndex {
		const members = new Set<string>();
		const classCounts = new Map<string, number>();
		const token = /(\.)?([A-Za-z_$][\w$]*)/g;

		for (const text of corpus) {
			token.lastIndex = 0;
			for (let m = token.exec(text); m !== null; m = token.exec(text)) {
				const [, dot, name] = m;
				if (dot && declared.members.has(name)) members.add(name);
				if (declared.classes.has(name)) classCounts.set(name, (classCounts.get(name) ?? 0) + 1);
			}
		}

		const classes = new Set<string>();
		for (const [name, count] of classCounts) {
			if (count > 1) classes.add(name);
		}
		return { members, classes };
	}

	private analyzeFile(file: SourceFile): Violation[] {
		const violations: Violation[] = [];

		for (const classDecl of file.getClasses()) {
			const className = classDecl.getName();
			if (!className) continue;

			// Check if entire class is unused
			if (!this.usage.classes.has(className)) {
				violations.push(this.createDeadClassViolation(file, classDecl, className));
				continue; // Don't report individual members if whole class is dead
			}

			// Check individual members
			violations.push(...this.checkUnusedMethods(file, classDecl, className));
			violations.push(...this.checkUnusedProperties(file, classDecl, className));
		}

		return violations;
	}

	private createDeadClassViolation(
		file: SourceFile,
		classDecl: ClassDeclaration,
		className: string,
	): Violation {
		return this.fileViolation(
			file,
			classDecl.getStartLineNumber(),
			0,
			`Dead class: ${className} has no external references`,
			'Remove the entire class or file',
			true,
			{ type: 'class', className },
		);
	}

	private checkUnusedMethods(
		file: SourceFile,
		classDecl: ClassDeclaration,
		className: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const method of classDecl.getMethods()) {
			if (!this.shouldCheckMethod(method)) continue;

			const methodName = method.getName();
			if (!this.usage.members.has(methodName)) {
				violations.push(
					this.fileViolation(
						file,
						method.getStartLineNumber(),
						0,
						`Unused method: ${className}.${methodName}()`,
						'Remove the method or make it private',
						true,
						{ type: 'method', className, memberName: methodName },
					),
				);
			}
		}

		return violations;
	}

	private checkUnusedProperties(
		file: SourceFile,
		classDecl: ClassDeclaration,
		className: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const prop of classDecl.getProperties()) {
			if (!this.shouldCheckProperty(prop)) continue;

			const propName = prop.getName();
			if (!this.usage.members.has(propName)) {
				violations.push(
					this.fileViolation(
						file,
						prop.getStartLineNumber(),
						0,
						`Unused property: ${className}.${propName}`,
						'Remove the property or make it private',
						true,
						{ type: 'property', className, memberName: propName },
					),
				);
			}
		}

		return violations;
	}

	/** Methods are candidates unless `private` or a native `#private` (whose `.#name` the text scan can't see). */
	private shouldCheckMethod(method: MethodDeclaration): boolean {
		return !method.hasModifier(SyntaxKind.PrivateKeyword) && !method.getName().startsWith('#');
	}

	/** Properties are candidates unless `private`/`protected` or a native `#private`. */
	private shouldCheckProperty(prop: PropertyDeclaration): boolean {
		return (
			!prop.hasModifier(SyntaxKind.PrivateKeyword) &&
			!prop.hasModifier(SyntaxKind.ProtectedKeyword) &&
			!prop.getName().startsWith('#')
		);
	}
}
