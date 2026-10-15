import { createInMemoryProject } from '@n8n/rules-engine/ast';
import { describe, it, expect } from 'vitest';

import { EndpointScopeCoverageRule } from './endpoint-scope-coverage.rule.js';

const SOURCE = `
@RestController('/x')
export class XController {
	@Get('/scoped')
	@ProjectScope('workflow:read')
	scoped() {}

	@Post('/unscoped')
	unscoped() {}

	@Get('/public', { skipAuth: true })
	pub() {}

	@Get('/unauth', { allowUnauthenticated: true })
	unauth() {}

	@Get('/apikey', { apiKeyAuth: true })
	apiKey() {}
}

// Not a controller — its routes must be ignored.
export class NotAController {
	@Get('/ignored')
	ignored() {}
}
`;

describe('EndpointScopeCoverageRule', () => {
	const rule = new EndpointScopeCoverageRule();

	const analyze = (code: string) => {
		const project = createInMemoryProject();
		project.createSourceFile('x.controller.ts', code);
		return rule.analyzeProject(project);
	};

	it('flags only the authenticated, unscoped route on a controller', () => {
		const violations = analyze(SOURCE);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('XController.unscoped');
	});

	it('does not flag scoped, public, or non-controller routes', () => {
		const messages = analyze(SOURCE)
			.map((v) => v.message)
			.join('\n');

		expect(messages).not.toContain('XController.scoped'); // has @ProjectScope
		expect(messages).not.toContain('XController.pub'); // skipAuth
		expect(messages).not.toContain('XController.unauth'); // allowUnauthenticated
		expect(messages).not.toContain('XController.apiKey'); // apiKeyAuth
		expect(messages).not.toContain('NotAController'); // not a @RestController
	});
});
