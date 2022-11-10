/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/base'],

	parserOptions: {
		project: ['./tsconfig.json'],
		tsconfigRootDir: __dirname,
	},

	rules: {
		'import/order': 'off', // TODO: remove this
	},
};
