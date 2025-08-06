import { Tournament } from '@n8n/tournament';

import { PrototypeSanitizer } from './expression-sandboxing';

type Evaluator = (expr: string, data: unknown) => string | null | (() => unknown);
type ErrorHandler = (error: Error) => void;

const errorHandler: ErrorHandler = () => {};
const tournamentEvaluator = new Tournament(errorHandler, undefined, undefined, {
	before: [],
	after: [PrototypeSanitizer],
});
const evaluator: Evaluator = tournamentEvaluator.execute.bind(tournamentEvaluator);

export const setErrorHandler = (handler: ErrorHandler) => {
	tournamentEvaluator.errorHandler = handler;
};

export const evaluateExpression: Evaluator = (expr, data) => {
	return evaluator(expr, data);
};
