import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
	clean: true,
	entries: [
		{
			builder: 'mkdist',
			format: 'esm',
			ext: 'js',
			input: './src',
			declaration: true
		},
		{
			builder: 'mkdist',
			format: 'cjs',
			ext: 'cjs',
			input: './src',
			declaration: false
		},
	]
})
