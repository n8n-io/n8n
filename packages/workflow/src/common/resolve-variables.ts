/**
 * A variable that is either global (no `project`) or scoped to a project.
 * Structural shape shared by the backend `Variables` entity and the
 * frontend `EnvironmentVariable` type.
 */
export interface ScopedVariable {
	key: string;
	value: string | boolean | number;
	project?: { id: string } | null;
}

/**
 * Resolves variables to a flat key→value map.
 *
 * Globals are applied first, then variables belonging to `projectId` overwrite
 * them. This makes project variables win over same-key globals regardless of
 * the input order, which would otherwise leave the result dependent on
 * database row or store insertion order.
 *
 * @param variables Global and project-scoped variables, in any order
 * @param projectId Project whose variables take precedence, if any
 */
export function resolveVariables(
	variables: ScopedVariable[],
	projectId?: string,
): Record<string, string | boolean | number> {
	const resolved: Record<string, string | boolean | number> = {};

	for (const variable of variables) {
		if (!variable.project) {
			resolved[variable.key] = variable.value;
		}
	}

	for (const variable of variables) {
		if (projectId && variable.project?.id === projectId) {
			resolved[variable.key] = variable.value;
		}
	}

	return resolved;
}
