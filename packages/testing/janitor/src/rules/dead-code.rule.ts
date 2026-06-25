import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';

import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { matchesPatterns } from '../utils/paths.js';

/**
 * Dead Code Rule
 *
 * Finds unused methods, properties, and classes via reference tracing.
 *
 * Detects:
 * - Unused public methods (no external references)
 * - Unused public properties (no external references)
 * - Dead classes (entire class not referenced externally)
 * - Empty classes (no public members)
 */
export class DeadCodeRule extends AstRule<{ rootDir: string }> {
	readonly id = 'dead-code';
	readonly name = 'Dead Code';
	readonly description = 'Find unused methods, properties, and classes';
	readonly severity = 'warning' as const;

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
		// Reference resolution needs the whole suite loaded (a method used only by a
		// test must be seen as referenced) — so load broadly and filter to targets below.
		return {
			packages: ['.'],
			spec: { globs: ['**/*.ts', '!**/*.d.ts', '!node_modules/**'], resolveDependencies: true },
		};
	}

	analyze(context: { rootDir: string }): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	analyzeProject(
		project: Project,
		files: SourceFile[] = project
			.getSourceFiles()
			.filter((f) => matchesPatterns(f.getFilePath(), this.getTargetGlobs())),
	): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const fileViolations = this.analyzeFile(project, file);
			violations.push(...fileViolations);
		}

		return violations;
	}

	private analyzeFile(project: Project, file: SourceFile): Violation[] {
		const violations: Violation[] = [];

		for (const classDecl of file.getClasses()) {
			const className = classDecl.getName();
			if (!className) continue;

			// Check if entire class is unused
			if (!this.hasExternalReferences(file, classDecl)) {
				violations.push(this.createDeadClassViolation(file, classDecl, className));
				continue; // Don't report individual members if whole class is dead
			}

			// Check individual members
			violations.push(...this.checkUnusedMethods(project, file, classDecl, className));
			violations.push(...this.checkUnusedProperties(project, file, classDecl, className));
		}

		return violations;
	}

	private createDeadClassViolation(
		file: SourceFile,
		classDecl: ReturnType<SourceFile['getClasses']>[0],
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
		project: Project,
		file: SourceFile,
		classDecl: ReturnType<SourceFile['getClasses']>[0],
		className: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const method of classDecl.getMethods()) {
			if (method.hasModifier(SyntaxKind.PrivateKeyword)) continue;

			const methodName = method.getName();
			if (
				!this.hasExternalReferences(file, method) &&
				!this.hasTextUsage(project, file, methodName)
			) {
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
		project: Project,
		file: SourceFile,
		classDecl: ReturnType<SourceFile['getClasses']>[0],
		className: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const prop of classDecl.getProperties()) {
			if (this.isPrivateOrProtected(prop)) continue;

			const propName = prop.getName();
			if (!this.hasExternalReferences(file, prop) && !this.hasTextUsage(project, file, propName)) {
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

	private isPrivateOrProtected(
		prop: ReturnType<ReturnType<SourceFile['getClasses']>[0]['getProperties']>[0],
	): boolean {
		return (
			prop.hasModifier(SyntaxKind.PrivateKeyword) || prop.hasModifier(SyntaxKind.ProtectedKeyword)
		);
	}

	/**
	 * Text-based fallback for when ts-morph can't trace references through
	 * complex generics (e.g. Playwright fixture type chains).
	 * Searches all project files for `.memberName` followed by a non-word char.
	 */
	private hasTextUsage(project: Project, sourceFile: SourceFile, memberName: string): boolean {
		const escaped = memberName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const pattern = new RegExp(`\\.${escaped}\\b`);
		for (const file of project.getSourceFiles()) {
			if (file === sourceFile) continue;
			if (pattern.test(file.getFullText())) {
				return true;
			}
		}
		return false;
	}

	private hasExternalReferences(
		sourceFile: SourceFile,
		node: { findReferencesAsNodes: () => unknown[]; getStartLineNumber: () => number },
	): boolean {
		const refs = node.findReferencesAsNodes() as Array<{
			getSourceFile: () => SourceFile;
			getStartLineNumber: () => number;
		}>;

		return refs.some(
			(ref) =>
				ref.getSourceFile() !== sourceFile ||
				ref.getStartLineNumber() !== node.getStartLineNumber(),
		);
	}
}
