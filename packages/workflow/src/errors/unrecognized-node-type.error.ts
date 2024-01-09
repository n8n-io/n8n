import { ApplicationError } from './application.error';

export class UnrecognizedNodeTypeError extends ApplicationError {
	severity = 'warning';

	constructor(nodeType: string, nodeVersion?: number, nodeName?: string) {
		super('Unknown node type or version', {
			extra: {
				nodeType,
				nodeVersion,
				nodeName,
			},
		});
	}
}
