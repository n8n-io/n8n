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
	optional?: boolean;
	variadic?: boolean;
	description?: string;
	default?: string;
	// Function arguments have nested arguments
	args?: DocMetadataArgument[];
};
export type DocMetadataExample = {
	example: string;
	evaluated?: string;
	description?: string;
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
