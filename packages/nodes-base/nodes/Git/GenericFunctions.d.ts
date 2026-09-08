import type { INode, ResolvedFilePath } from 'n8n-workflow';
import type { ConfigListSummary, SimpleGit } from 'simple-git';
export declare function findBlacklistedKeys(config: ConfigListSummary, localConfigFiles: string[]): string[];
/**
 * Validates a git reference to prevent command injection attacks
 * @param reference - The git reference to validate (e.g., branch name, HEAD, refs/heads/main)
 * @param node - The node instance for error throwing
 * @throws {NodeOperationError} If the reference contains unsafe characters or patterns
 */
export declare function validateGitReference(reference: string, node: INode): void;
/**
 * Validates a git tag name. Tags follow git's ref-format rules, which permit
 * `+` (e.g. SemVer build metadata like `v1.2.3+build.1`), so the whitelist is
 * a superset of `validateGitReference` while keeping the same safeguards.
 * @param name - The tag name to validate
 * @param node - The node instance for error throwing
 * @throws {NodeOperationError} If the tag name contains unsafe characters or patterns
 */
export declare function validateGitTag(name: string, node: INode): void;
export declare function validateGitRemoteName(name: string, node: INode): void;
export interface GitRepositoryLayout {
    /** `--show-toplevel`, or undefined when git reports no work tree. */
    topLevel: string | undefined;
    /** `--absolute-git-dir`: the per-worktree git directory. */
    gitDir: string;
    /** `--git-common-dir`, printed relative to git's cwd. */
    commonDir: string;
}
export declare function getGitRepositoryLayout(git: SimpleGit): Promise<GitRepositoryLayout>;
/**
 * Whole-component path containment. `parent` may be a filesystem root, which already ends in a
 * separator, so appending another one would never match.
 *
 * Both arguments must be resolved absolute paths. This is a pure string test: it does not
 * normalise `..`, a trailing separator or an empty `parent`.
 */
export declare function isWithinPath(parent: string, candidate: string): boolean;
/**
 * The directory owning a git directory: `<top>` for both `<top>/.git` and
 * `<top>/.git/modules/<name>`. Callers need it because the default allowed-path patterns
 * reject every path with a `.git` component.
 */
export declare function ownerOfGitDir(gitDirPath: ResolvedFilePath): ResolvedFilePath;
export type GitRepositoryType = 'source' | 'target';
export interface ConfiguredRemoteRepositories {
    sourceValidationTargets: string[];
    targetValidationTargets: string[];
    pushTarget: string | undefined;
}
export declare function getRepositoryTypeForRemoteConfigKey(key: string): GitRepositoryType | undefined;
export declare function getConfiguredRemoteRepositories(configValues: Record<string, Record<string, string | string[] | undefined>>, node: INode): ConfiguredRemoteRepositories;
export declare function mapGitConfigList(config: ConfigListSummary): {
    _file: string;
    "remote.origin.url": string | string[];
    "remote.origin.pushurl": string | string[];
}[];
//# sourceMappingURL=GenericFunctions.d.ts.map