import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import type { Violation } from '@n8n/rules-engine';
import type { Project } from 'ts-morph';

import { isPageImport } from '../utils/ast-helpers.js';

const DEFAULT_EXCLUDES = ['n8nPage.ts', 'BasePage.ts', 'BaseModal.ts', 'BaseComponent.ts'];
const normalize = (p: string) => p.replace(/\\/g, '/');

/**
 * Pages must not import other pages directly. Janitor-owned (playwright domain
 * logic via {@link isPageImport}) but built on the shared `@n8n/rules-engine/ast`
 * substrate rather than a janitor-local base.
 */
export class BoundaryProtectionRule extends AstRule<{ rootDir: string }> {
	readonly id = 'boundary-protection';
	readonly name = 'Boundary Protection';
	readonly description = 'Page objects should not import other page objects directly';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		return ['pages/**/*.ts'];
	}

	protected projectConfig(): AstProjectConfig {
		return { packages: ['.'], spec: { globs: this.getTargetGlobs() } };
	}

	analyze(context: { rootDir: string }): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	analyzeProject(project: Project): Violation[] {
		const excludes = (this.getOptions().excludeFromPages as string[]) ?? DEFAULT_EXCLUDES;
		const violations: Violation[] = [];

		for (const file of project.getSourceFiles()) {
			const filePath = normalize(file.getFilePath());
			if (filePath.includes('/components/')) continue;
			if (excludes.some((e) => filePath.endsWith(e))) continue;

			for (const decl of file.getImportDeclarations()) {
				const spec = decl.getModuleSpecifierValue();
				if (isPageImport(spec, filePath)) {
					violations.push(
						this.nodeViolation(
							decl,
							`Page imports another page: ${spec}`,
							'Use composition through composables or inject via constructor instead',
						),
					);
				}
			}
		}

		return violations;
	}
}
