export interface ExtensionMap {
	typeName: string;
	functions: Record<string, Extension>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type Extension = Function & { doc?: DocMetadata };

export type NativeDoc = {
	typeName: string;
	properties?: Record<string, { doc?: DocMetadata }>;
	functions: Record<string, { doc?: DocMetadata }>;
};

export type DocMetadataArgument = {
	name: string;
	type?: string;
	description?: string;
	default?: unknown;
};
export type DocMetadataExample = {
	subject: unknown;
	args: string[];
	description?: string;
	evaluated?: unknown;
};

export type DocMetadata = {
	name: string;
	returnType: string;
	description?: string;
	section?: string;
	hidden?: boolean;
	aliases?: string[];
	args?: DocMetadataArgument[];
	examples?: DocMetadataExample[];
	docURL?: string;
};
