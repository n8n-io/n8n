import { Project } from 'ts-morph';
import type { SourceFile } from 'ts-morph';

export interface PackageProjectSpec {
	/** Globs relative to the package dir; `!`-prefixed entries exclude. Defaults to source `.ts`, no tests. */
	globs?: string[];
	/** Resolve cross-file imports — required by reference-based rules (dead-code, impact). Off by default. */
	resolveDependencies?: boolean;
}

/** A rule's project requirement. Rules needing no AST return undefined. */
export interface AstProjectConfig {
	/** Package dirs relative to the repo root, e.g. `'packages/cli'`. */
	packages: string[];
	spec?: PackageProjectSpec;
	/** Per-package overrides, merged over `spec`. */
	overrides?: Record<string, PackageProjectSpec>;
}

export interface PackageProject {
	package: string;
	project: Project;
	files: SourceFile[];
}

const DEFAULT_GLOBS = ['src/**/*.ts', '!src/**/*.test.ts'];

/** POSIX-join glob segments — `\` breaks globby/minimatch on Windows. */
const toGlob = (...segments: string[]): string =>
	segments.join('/').replace(/\\/g, '/').replace(/\/+/g, '/');

/** One scoped Project per package — bounded memory, and `resolveDependencies` can differ per package. */
export function buildPackageProjects(rootDir: string, config: AstProjectConfig): PackageProject[] {
	return config.packages.map((pkg) => {
		const spec: PackageProjectSpec = { ...config.spec, ...config.overrides?.[pkg] };
		const project = new Project({
			skipAddingFilesFromTsConfig: true,
			skipFileDependencyResolution: !spec.resolveDependencies,
		});
		const patterns = (spec.globs ?? DEFAULT_GLOBS).map((g) =>
			g.startsWith('!') ? `!${toGlob(rootDir, pkg, g.slice(1))}` : toGlob(rootDir, pkg, g),
		);
		const files = project.addSourceFilesAtPaths(patterns);
		return { package: pkg, project, files };
	});
}

/** In-memory Project for unit tests — no real filesystem. */
export function createInMemoryProject(): Project {
	return new Project({ useInMemoryFileSystem: true });
}
