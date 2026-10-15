// Restricts direct imports of the Kafka libraries to their sanctioned access
// points: `@confluentinc/kafka-javascript` only through v2/transport/client.ts,
// and v1's `kafkajs` never from v2 code. Spread into packages/nodes-base's
// eslint.config.mjs, which is where `files`/`ignores` globs below are resolved
// from (this file's own location doesn't affect path resolution).

const KAFKA_V2_LIBRARY_MESSAGE =
	'Import the Kafka library only through getKafkaLibrary() in v2/transport/client.ts.';
const KAFKA_V1_LIBRARY_MESSAGE = 'v2 Kafka code must not depend on the v1 kafkajs library.';

// Flat-config `rules` blocks replace, not merge, for any file matched by more
// than one block — so every scoped `no-restricted-syntax` override below must
// repeat the base config's raw-enum rule, or it silently stops applying there.
const NO_RAW_ENUM_SYNTAX_RULE = {
	selector: 'TSEnumDeclaration:not([const=true])',
	message:
		'Do not declare raw enums as it leads to runtime overhead. Use const enum instead. See https://www.typescriptlang.org/docs/handbook/enums.html#const-enums',
};

// One name/message pair drives the static-import, dynamic-import, and
// require() checks, so they can't drift out of sync.
function kafkaLibraryRestriction(name, message) {
	return {
		path: { name, allowTypeImports: true, message },
		syntax: [
			{ selector: `ImportExpression[source.value='${name}']`, message },
			{ selector: `CallExpression[callee.name='require'][arguments.0.value='${name}']`, message },
		],
	};
}

const kafkaV2LibraryRestriction = kafkaLibraryRestriction(
	'@confluentinc/kafka-javascript',
	KAFKA_V2_LIBRARY_MESSAGE,
);
const kafkaV1LibraryRestriction = kafkaLibraryRestriction('kafkajs', KAFKA_V1_LIBRARY_MESSAGE);

// Same reason as above: combine every restriction for one set of files into a
// single rule config here, since a second block targeting those files would
// replace these entries instead of adding to them.
function kafkaRestrictionRules(...restrictions) {
	return {
		'@typescript-eslint/no-restricted-imports': [
			'error',
			{ paths: restrictions.map(({ path }) => path) },
		],
		'no-restricted-syntax': [
			'error',
			NO_RAW_ENUM_SYNTAX_RULE,
			...restrictions.flatMap(({ syntax }) => syntax),
		],
	};
}

export const kafkaImportRestrictions = [
	{
		// v1 may keep using kafkajs, but can't reach for the new library directly.
		files: ['./nodes/Kafka/**/*.ts'],
		ignores: ['./nodes/Kafka/v2/**/*.ts'],
		rules: kafkaRestrictionRules(kafkaV2LibraryRestriction),
	},
	{
		// v2 code must go through client.ts's getKafkaLibrary() for the new
		// library, and can't use v1's kafkajs at all.
		files: ['./nodes/Kafka/v2/**/*.ts'],
		ignores: ['./nodes/Kafka/v2/transport/client.ts'],
		rules: kafkaRestrictionRules(kafkaV2LibraryRestriction, kafkaV1LibraryRestriction),
	},
	{
		// client.ts is the one file allowed to import the new library directly.
		files: ['./nodes/Kafka/v2/transport/client.ts'],
		rules: kafkaRestrictionRules(kafkaV1LibraryRestriction),
	},
];
