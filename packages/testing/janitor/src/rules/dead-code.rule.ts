import * as fs from 'node:fs';
import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation, FixResult } from '../types.js';
import { getRelativePath } from '../utils/paths.js';

/**
 * Dead Code Rule
 *
 * Finds and optionally removes unused methods, properties, and classes.
 * Uses reference tracing to detect code that isn't used anywhere in the codebase.
 *
 * Detects:
 * - Unused public methods (no external references)
 * - Unused public properties (no external references)
 * - Dead classes (entire class not referenced externally)
 * - Empty classes (no public members)
 *
 * Supports auto-fixing with --fix --write
 */
export class DeadCodeRule extends BaseRule {
	readonly id = 'dead-code';
	readonly name = 'Dead Code';
	readonly description = 'Find and remove unused methods, properties, and classes';
	readonly severity = 'warning' as const;
	readonly fixable = true;

	getTargetGlobs(): string[] {
		const config = getConfig();
		return [
			...config.patterns.pages,
			...config.patterns.flows,
			...config.patterns.helpers,
			...config.patterns.services,
		];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const fileViolations = this.analyzeFile(file);
			violations.push(...fileViolations);
		}

		return violations;
	}

	private analyzeFile(file: SourceFile): Violation[] {
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
			violations.push(...this.checkUnusedMethods(file, classDecl, className));
			violations.push(...this.checkUnusedProperties(file, classDecl, className));
		}

		return violations;
	}

	private createDeadClassViolation(
		file: SourceFile,
		classDecl: ReturnType<SourceFile['getClasses']>[0],
		className: string,
	): Violation {
		return this.createViolation(
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
		classDecl: ReturnType<SourceFile['getClasses']>[0],
		className: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const method of classDecl.getMethods()) {
			if (method.hasModifier(SyntaxKind.PrivateKeyword)) continue;

			const methodName = method.getName();
			if (!this.hasExternalReferences(file, method)) {
				violations.push(
					this.createViolation(
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
		classDecl: ReturnType<SourceFile['getClasses']>[0],
		className: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const prop of classDecl.getProperties()) {
			if (this.isPrivateOrProtected(prop)) continue;

			const propName = prop.getName();
			if (!this.hasExternalReferences(file, prop)) {
				violations.push(
					this.createViolation(
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

	fix(project: Project, violations: Violation[], write: boolean): FixResult[] {
		const results: FixResult[] = [];
		const byFile = this.groupViolationsByFile(violations);
		const filesToDelete = new Set<string>();

		for (const [filePath, fileViolations] of byFile) {
			const sourceFile = project.getSourceFile(filePath);
			if (!sourceFile) continue;

			// Check if entire file should be deleted
			if (this.shouldDeleteFile(sourceFile, fileViolations)) {
				filesToDelete.add(filePath);
				results.push(this.createFixResult(filePath, 'remove-file', write));
				continue;
			}

			// Process individual member removals
			results.push(...this.processFileViolations(sourceFile, filePath, fileViolations, write));
		}

		// Apply changes
		if (write) {
			project.saveSync();
			this.deleteFiles(filesToDelete);
		}

		return results;
	}

	private groupViolationsByFile(violations: Violation[]): Map<string, Violation[]> {
		const byFile = new Map<string, Violation[]>();
		for (const v of violations) {
			if (!v.fixable || !v.fixData) continue;
			const existing = byFile.get(v.file) ?? [];
			existing.push(v);
			byFile.set(v.file, existing);
		}
		return byFile;
	}

	private shouldDeleteFile(sourceFile: SourceFile, fileViolations: Violation[]): boolean {
		const deadClassViolations = fileViolations.filter((v) => v.fixData?.type === 'class');
		const allClassesInFile = sourceFile.getClasses();
		return deadClassViolations.length === allClassesInFile.length && allClassesInFile.length > 0;
	}

	private createFixResult(
		filePath: string,
		action: 'remove-file' | 'remove-method' | 'remove-property',
		write: boolean,
		target?: string,
	): FixResult {
		return {
			file: getRelativePath(filePath),
			action,
			target,
			applied: write,
		};
	}

	private processFileViolations(
		sourceFile: SourceFile,
		filePath: string,
		fileViolations: Violation[],
		write: boolean,
	): FixResult[] {
		const results: FixResult[] = [];

		for (const violation of fileViolations) {
			const fixData = violation.fixData;
			if (!fixData || fixData.type === 'class' || fixData.type === 'edit') continue;

			const classDecl = sourceFile.getClass(fixData.className);
			if (!classDecl) continue;

			const result = this.removeMember(classDecl, filePath, fixData, write);
			if (result) results.push(result);
		}

		return results;
	}

	private removeMember(
		classDecl: ReturnType<SourceFile['getClass']>,
		filePath: string,
		fixData: { type: 'method' | 'property'; className: string; memberName: string },
		write: boolean,
	): FixResult | null {
		if (!classDecl) return null;

		if (fixData.type === 'method') {
			const method = classDecl.getMethod(fixData.memberName);
			if (method) {
				if (write) method.remove();
				return this.createFixResult(
					filePath,
					'remove-method',
					write,
					`${fixData.className}.${fixData.memberName}()`,
				);
			}
		} else if (fixData.type === 'property') {
			const prop = classDecl.getProperty(fixData.memberName);
			if (prop) {
				if (write) prop.remove();
				return this.createFixResult(
					filePath,
					'remove-property',
					write,
					`${fixData.className}.${fixData.memberName}`,
				);
			}
		}

		return null;
	}

	private deleteFiles(filesToDelete: Set<string>): void {
		for (const filePath of filesToDelete) {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		}
	}
}
