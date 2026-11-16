/**
 * Decides where the merged schema for one telemetry group goes, following the
 * layout the runtime resolver reads (`<node source dir>/__schema__/v<X.Y.Z>/…`),
 * or why the group is skipped. The plain file holds the shape for the default
 * value of a simplify-style flag. The other value goes to
 * `<operation>.<param>-<value>.json`, which the resolvers pick by parameter value.
 */

/** "1.2" → "v1.2.0", the on-disk version folder name. */
function versionDir(version) {
	return 'v' + String(version).split('.').concat(['0', '0']).slice(0, 3).join('.');
}

/** The SDK finds a schema folder by node name; a different folder name needs `schemaPath`. */
function schemaPathHint(nodeType, dir) {
	const shortName = nodeType.split('.').pop() ?? '';
	const folder = dir.split('/').pop() ?? '';
	if (folder.toLowerCase() === shortName.toLowerCase()) return undefined;
	return dir.match(/(?:^|\/)nodes\/(.+)$/)?.[1];
}

/** Whether the group's simplify flag is unset or set to its default value. */
function usesDefault(group, defaultOf) {
	if (!group.simplify_param || group.simplify == null) return { isDefault: true };
	const defaultValue = defaultOf(group);
	if (defaultValue === undefined) return { skip: `unknown default for ${group.simplify_param}` };
	return { isDefault: group.simplify === defaultValue };
}

function variantSuffix(group, defaultOf) {
	const { isDefault, skip } = usesDefault(group, defaultOf);
	if (skip) return { skip };
	if (isDefault) return { suffix: '' };
	if (group.simplify_param.includes('.')) {
		return { skip: `nested variant parameter ${group.simplify_param} is not supported` };
	}
	return { suffix: `.${group.simplify_param}-${group.simplify}` };
}

function planWithOperation(group, base, defaultOf) {
	const variant = variantSuffix(group, defaultOf);
	if (variant.skip) return variant;
	const opPath = [group.resource, group.operation].filter(Boolean).join('/');
	return { file: `${base}/${opPath}${variant.suffix}.json` };
}

function planWithoutOperation(group, entry, base, defaultOf) {
	const { isDefault, skip } = usesDefault(group, defaultOf);
	if (skip) return { skip };
	if (!isDefault)
		return { skip: 'simplify variant on a node without an operation is not supported' };
	if (entry.noOperationSiblings.length > 0) {
		return { skip: `shared folder with ${entry.noOperationSiblings.join(', ')}` };
	}
	return { file: `${base}/output.json` };
}

/**
 * @param {{ node_type: string, node_version: string, resource?: string|null, operation?: string|null,
 *   simplify_param?: string|null, simplify?: string|null }} group
 * @param {Map<string, { dir: string, noOperationSiblings: string[] }>} index node type → source folder
 * @param {{ defaultOf: (group: object) => 'true' | 'false' | undefined }} options default of the group's flag
 * @returns {{ file?: string, skip?: string, schemaPath?: string }}
 */
export function planSchemaFile(group, index, { defaultOf }) {
	const entry = index.get(group.node_type);
	if (!entry) return { skip: `unknown node ${group.node_type}` };
	if (![null, undefined, 'true', 'false'].includes(group.simplify)) {
		return { skip: 'simplify flag holds an expression' };
	}
	if (!group.operation && !/trigger$/i.test(group.node_type)) {
		return { skip: 'not a trigger: output depends on mode or input' };
	}

	const base = `${entry.dir}/__schema__/${versionDir(group.node_version)}`;
	const schemaPath = schemaPathHint(group.node_type, entry.dir);
	const placed = group.operation
		? planWithOperation(group, base, defaultOf)
		: planWithoutOperation(group, entry, base, defaultOf);

	return schemaPath ? { ...placed, schemaPath } : placed;
}
