const config = {
	reporter: ['html'],
	reportDir: 'coverage',
	tempDir: '.nyc_output',
	include: [
		'../../../packages/frontend/editor-ui/src/**/*.{js,ts,vue}',
		'../../../packages/frontend/editor-ui/dist/**/*.{js,ts}',
	],
	exclude: [
		'**/*.test.{js,ts}',
		'**/*.spec.{js,ts}',
		'**/node_modules/**',
		'**/coverage/**',
		'**/.nyc_output/**',
	],
	sourceMap: true,
};

export = config;
