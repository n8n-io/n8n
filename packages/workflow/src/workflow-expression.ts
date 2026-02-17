import { Expression } from './expression';

import type { Workflow } from './workflow';

export class WorkflowExpression {
	private readonly expression: Expression;

	constructor(private readonly workflow: Workflow) {
		this.expression = new Expression(this.workflow);
	}
}
