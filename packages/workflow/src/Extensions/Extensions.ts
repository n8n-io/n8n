export interface ExtensionMap {
	typeName: string;
	// eslint-disable-next-line @typescript-eslint/ban-types
	functions: Record<string, Function & { doc?: DocMetadata }>;
}

export type DocMetadata = {
	name: string;
	returnType: string;
	description?: string;
	aliases?: string[];
	args?: unknown[];
};
