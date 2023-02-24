export interface ExtensionMap {
	typeName: string;
	// eslint-disable-next-line @typescript-eslint/ban-types
	functions: Record<string, Function & { doc?: DocMetadata }>;
}

export type NativeDoc = {
	typeName: string;
	properties?: Record<string, { doc?: DocMetadata }>;
	functions: Record<string, { doc?: DocMetadata }>;
};

export type DocMetadata = {
	name: string;
	returnType: string;
	description?: string;
	aliases?: string[];
	args?: Array<{ name: string; type?: string }>;
	docURL?: string;
};
