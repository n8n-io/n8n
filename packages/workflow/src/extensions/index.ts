export {
	extend,
	extendOptional,
	hasExpressionExtension,
	countArrayWildcards,
	expressionUsesArrayWildcard,
	hasArrayWildcardSyntax,
	replaceArrayWildcards,
	hasNativeMethod,
	extendTransform,
	EXTENSION_OBJECTS as ExpressionExtensions,
} from './expression-extension';

export type {
	DocMetadata,
	NativeDoc,
	Extension,
	DocMetadataArgument,
	DocMetadataExample,
} from './extensions';

export type { Alias, AliasCompletion } from './extensions';
