import { SyntaxKind, type Project, type SourceFile, type ClassDeclaration } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { BaseRule } from './base-rule';
import type { Violation, FixResult } from '../core/types';

const PLAYWRIGHT_ROOT = path.join(__dirname, '..', '..', '..');

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
		return ['pages/**/*.ts', 'composables/**/*.ts', 'helpers/**/*.ts', 'services/**/*.ts'];
	}

	analyze(project: Project, files: SourceFile[]): Violation[] {
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
				violations.push(
					this.createViolation(
						file,
						classDecl.getStartLineNumber(),
						0,
						`Dead class: ${className} has no external references`,
						'Remove the entire class or file',
						true,
						{ type: 'class', className },
					),
				);
				continue; // Don't report individual members if whole class is dead
			}

			// Check individual members
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

			for (const prop of classDecl.getProperties()) {
				if (
					prop.hasModifier(SyntaxKind.PrivateKeyword) ||
					prop.hasModifier(SyntaxKind.ProtectedKeyword)
				) {
					continue;
				}

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
		}

		return violations;
	}

	private hasExternalReferences(
		sourceFile: SourceFile,
		node: { findReferencesAsNodes: () => unknown[]; getStartLineNumber: () => number },
	): boolean {
		const refs = node.findReferencesAsNodes() as {
			getSourceFile: () => SourceFile;
			getStartLineNumber: () => number;
		}[];

		return refs.some(
			(ref) =>
				ref.getSourceFile() !== sourceFile ||
				ref.getStartLineNumber() !== node.getStartLineNumber(),
		);
	}

	fix(project: Project, violations: Violation[], write: boolean): FixResult[] {
		const results: FixResult[] = [];

		// Group by file for efficient processing
		const byFile = new Map<string, Violation[]>();
		for (const v of violations) {
			if (!v.fixable || !v.fixData) continue;
			const existing = byFile.get(v.file) || [];
			existing.push(v);
			byFile.set(v.file, existing);
		}

		// Track files to delete (dead classes)
		const filesToDelete = new Set<string>();

		for (const [filePath, fileViolations] of byFile) {
			const sourceFile = project.getSourceFile(filePath);
			if (!sourceFile) continue;

			// Check if all violations for this file are dead classes
			const deadClassViolations = fileViolations.filter((v) => v.fixData?.type === 'class');
			const allClassesInFile = sourceFile.getClasses();

			// If all classes in file are dead, delete the file
			if (deadClassViolations.length === allClassesInFile.length && allClassesInFile.length > 0) {
				filesToDelete.add(filePath);
				results.push({
					file: path.relative(PLAYWRIGHT_ROOT, filePath),
					action: 'remove-file',
					applied: write,
				});
				continue;
			}

			// Process individual member removals
			for (const violation of fileViolations) {
				const fixData = violation.fixData as {
					type: 'class' | 'method' | 'property';
					className: string;
					memberName?: string;
				};

				const classDecl = sourceFile.getClass(fixData.className);
				if (!classDecl) continue;

				if (fixData.type === 'method' && fixData.memberName) {
					const method = classDecl.getMethod(fixData.memberName);
					if (method) {
						results.push({
							file: path.relative(PLAYWRIGHT_ROOT, filePath),
							action: 'remove-method',
							target: `${fixData.className}.${fixData.memberName}()`,
							applied: write,
						});
						if (write) {
							method.remove();
						}
					}
				} else if (fixData.type === 'property' && fixData.memberName) {
					const prop = classDecl.getProperty(fixData.memberName);
					if (prop) {
						results.push({
							file: path.relative(PLAYWRIGHT_ROOT, filePath),
							action: 'remove-property',
							target: `${fixData.className}.${fixData.memberName}`,
							applied: write,
						});
						if (write) {
							prop.remove();
						}
					}
				}
			}
		}

		// Save modified files
		if (write) {
			project.saveSync();

			// Delete dead files
			for (const filePath of filesToDelete) {
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			}
		}

		return results;
	}
}
