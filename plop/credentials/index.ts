import { PlopGeneratorConfig } from 'node-plop';

const generator: PlopGeneratorConfig = {
	description: 'Create credentials for a service provider',
	prompts: [
		{
			type: 'input',
			name: 'creds',
			message: 'Please enter the service provider name',
			validate: (input: string) => input !== null && input !== '',
		},
		{
			type: 'list',
			name: 'strategy',
			choices: ['apiKey'], // goal here is to add other credentials strategies
			message: 'Please choose a strategy',
		},
		{
			type: 'confirm',
			name: 'hasDocumentation',
			message: 'Do you want to add documentation URL to your credentials ?'
		},
		{
			type: 'input',
			name: 'documentationUrl',
			message: 'Please enter documentation URL',
			when: (input) => input.hasDocumentation,
		}
	],
	actions: (data): any[] => {
		const result: any[] = [];

		// Add the basic file (solo choice apikey)
		result.push({
			type: 'add',
			path: './packages/nodes_base/credentials/{{pascalCase creds}}.credentials.ts',
			templateFile: './plop/credentials/strategies/apikey.ts',
		});

		// Add documentation url if needed
		if (data.hasDocumentation) {
			result.push({
				type: 'modify',
				template: 'documentationUrl = {{documentationUrl}}',
				pattern: /documentationUrl = null/g,
			});
		}

		// Lint results
		result.push({
			type: 'eslint',
			path: './packages/nodes_base/credentials/{{pascalCase creds}}.credentials.ts',
		});

		return result;
	}
}

export default generator;
