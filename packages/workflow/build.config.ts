import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
	clean: true,
	entries: [
		{
			builder: 'mkdist',
			format: 'esm',
			ext: 'mjs',
			input: './src',
			declaration: false
		},
		{
			builder: 'mkdist',
			format: 'cjs',
			ext: 'js',
			input: './src',
			declaration: true
		},
	]
})
