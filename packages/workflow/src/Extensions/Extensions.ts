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

export type DocMetadata = {
	name: string;
	returnType: string;
	description?: string;
	section?: string;
	hidden?: boolean;
	aliases?: string[];
	args?: Array<{ name: string; type?: string }>;
	docURL?: string;
};
