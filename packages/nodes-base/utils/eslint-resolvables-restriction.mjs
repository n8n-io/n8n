// Nodes resolve `{{ }}` in free text through resolveExpressions(). A hand-rolled
// `text.replace(resolvable, value)` loop expands `$` sequences in the value.
// Spread into packages/nodes-base's eslint configs; the globs below resolve from there.

export const resolvablesRestriction = [
	{
		files: ['./nodes/**/*.ts'],
		// Tests import the whole module to spy on its helpers
		ignores: ['**/*.test.ts', '**/test/**', '**/__tests__/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							regex: '(^@utils|/utils)/utilities$',
							importNames: ['getResolvables'],
							message: 'Use resolveExpressions() so resolved values are inserted literally.',
						},
					],
				},
			],
		},
	},
];
