// @TODO: Improve typings, rename file

type TypeName = 'String' | 'Number' | 'Array' | 'Object' | 'Date';

export type ExtensionMap =
	| NumberExtensions
	| StringExtensions
	| ObjectExtensions
	| DateExtensions
	| ArrayExtensions;

type ExtensionFunctionMetadata = {
	description?: string;
};

type MakeExtensions<N extends TypeName> = {
	typeName: N;
	functions: {
		// eslint-disable-next-line @typescript-eslint/ban-types
		[key: string]: Function & ExtensionFunctionMetadata;
	};
};

type NumberExtensions = MakeExtensions<'Number'>;
type StringExtensions = MakeExtensions<'String'>;
type ObjectExtensions = MakeExtensions<'Object'>;
type DateExtensions = MakeExtensions<'Date'>;
type ArrayExtensions = MakeExtensions<'Array'>;
