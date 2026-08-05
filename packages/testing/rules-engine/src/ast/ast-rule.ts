import type { Node, SourceFile } from 'ts-morph';

import { BaseRule } from '../base-rule.js';
import type { FixData, Violation } from '../types.js';
import { buildPackageProjects } from './project.js';
import type { AstProjectConfig, PackageProject } from './project.js';

/**
 * Base for AST-backed rules. A rule opts into ts-morph by overriding
 * {@link projectConfig}; rules needing no AST leave it undefined and pay nothing.
 * The engine core stays ts-morph-free — this lives behind the `/ast` entry point.
 */
export abstract class AstRule<
	TContext extends { rootDir: string } = { rootDir: string },
> extends BaseRule<TContext> {
	protected projectConfig(_context: TContext): AstProjectConfig | undefined {
		return undefined;
	}

	protected projects(context: TContext): PackageProject[] {
		const config = this.projectConfig(context);
		return config ? buildPackageProjects(context.rootDir, config) : [];
	}

	protected nodeViolation(
		node: Node,
		message: string,
		suggestion?: string,
		fixable?: boolean,
		fixData?: FixData,
	): Violation {
		return this.createViolation(
			node.getSourceFile().getFilePath(),
			node.getStartLineNumber(),
			0,
			message,
			suggestion,
			fixable,
			fixData,
		);
	}

	/** Create a violation for a source file at an explicit line/column. */
	protected fileViolation(
		file: SourceFile,
		line: number,
		column: number,
		message: string,
		suggestion?: string,
		fixable?: boolean,
		fixData?: FixData,
	): Violation {
		return this.createViolation(
			file.getFilePath(),
			line,
			column,
			message,
			suggestion,
			fixable,
			fixData,
		);
	}
}
