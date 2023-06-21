import * as tmpl from '@n8n_io/riot-tmpl';
import type { TmplDifference } from '@n8n/tournament';
import { Tournament } from '@n8n/tournament';
import type { ExpressionEvaluatorType } from './Interfaces';

type Evaluator = (expr: string, data: unknown) => tmpl.ReturnValue;
type ErrorHandler = (error: Error) => void;
type DifferenceHandler = (expr: string) => void;

// Set it to use double curly brackets instead of single ones
tmpl.brackets.set('{{ }}');

let errorHandler: ErrorHandler = () => {};
let differenceHandler: DifferenceHandler = () => {};
const differenceChecker = (diff: TmplDifference) => {
	if (diff.same) {
		return;
	}
	if (diff.has?.function || diff.has?.templateString) {
		return;
	}
	differenceHandler(diff.expression as string);
};
const tournamentEvaluator = new Tournament(errorHandler, undefined, differenceChecker);
let evaluator: Evaluator = tmpl.tmpl;

export const setErrorHandler = (handler: ErrorHandler) => {
	errorHandler = handler;
	tmpl.tmpl.errorHandler = handler;
	tournamentEvaluator.errorHandler = handler;
};

export const setEvaluator = (evalType: ExpressionEvaluatorType) => {
	console.log('setEvaluator', evalType);
	if (evalType === 'tmpl') {
		evaluator = tmpl.tmpl;
	} else if (evalType === 'tournament') {
		evaluator = tournamentEvaluator.execute.bind(tournamentEvaluator);
	}
};

export const setDiffReporter = (reporter: (expr: string) => void) => {
	differenceHandler = reporter;
};

export const checkEvaluatorDifferences = (expr: string) => {
	tournamentEvaluator.tmplDiff(expr);
};

export const getEvaluator = () => {
	return evaluator;
};

export const evaluateExpression: Evaluator = (expr, data) => evaluator(expr, data);
