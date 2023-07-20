import * as tmpl from '@n8n_io/riot-tmpl';
import type { ReturnValue, TmplDifference } from '@n8n/tournament';
import { Tournament } from '@n8n/tournament';
import type { ExpressionEvaluatorType } from './Interfaces';
import * as ErrorReporterProxy from './ErrorReporterProxy';

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
	if (diff.expression === 'UNPARSEABLE') {
		differenceHandler(diff.expression);
	} else {
		differenceHandler(diff.expression.value);
	}
};
const tournamentEvaluator = new Tournament(errorHandler, undefined);
let evaluator: Evaluator = tmpl.tmpl;
let currentEvaluatorType: ExpressionEvaluatorType = 'tmpl';
let diffExpressions = false;

export const setErrorHandler = (handler: ErrorHandler) => {
	errorHandler = handler;
	tmpl.tmpl.errorHandler = handler;
	tournamentEvaluator.errorHandler = handler;
};

export const setEvaluator = (evalType: ExpressionEvaluatorType) => {
	currentEvaluatorType = evalType;
	if (evalType === 'tmpl') {
		evaluator = tmpl.tmpl;
	} else if (evalType === 'tournament') {
		evaluator = tournamentEvaluator.execute.bind(tournamentEvaluator);
	}
};

export const setDiffReporter = (reporter: (expr: string) => void) => {
	differenceHandler = reporter;
};

export const setDifferEnabled = (enabled: boolean) => {
	diffExpressions = enabled;
};

const diffCache: Record<string, TmplDifference | null> = {};

export const checkEvaluatorDifferences = (expr: string): TmplDifference | null => {
	if (expr in diffCache) {
		return diffCache[expr];
	}
	let diff: TmplDifference | null;
	try {
		diff = tournamentEvaluator.tmplDiff(expr);
	} catch (e) {
		// We don't include the expression for privacy reasons
		differenceHandler('ERROR');
		diff = null;
	}

	if (diff?.same === false) {
		differenceChecker(diff);
	}

	diffCache[expr] = diff;
	return diff;
};

export const getEvaluator = () => {
	return evaluator;
};

export const evaluateExpression: Evaluator = (expr, data) => {
	if (!diffExpressions) {
		return evaluator(expr, data);
	}
	const diff = checkEvaluatorDifferences(expr);

	// We already know that they're different so don't bother
	// evaluating with both evaluators
	if (!diff?.same) {
		return evaluator(expr, data);
	}

	let tmplValue: tmpl.ReturnValue;
	let tournValue: ReturnValue;
	let wasTmplError = false;
	let tmplError: unknown;
	let wasTournError = false;
	let tournError: unknown;

	try {
		tmplValue = tmpl.tmpl(expr, data);
	} catch (error) {
		tmplError = error;
		wasTmplError = true;
	}

	try {
		tournValue = tournamentEvaluator.execute(expr, data);
	} catch (error) {
		tournError = error;
		wasTournError = true;
	}

	if (
		wasTmplError !== wasTournError ||
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		JSON.stringify(tmplValue!) !== JSON.stringify(tournValue!)
	) {
		if (diff.expression) {
			differenceHandler(diff.expression.value);
		}
	}

	if (currentEvaluatorType === 'tmpl') {
		if (wasTmplError) {
			throw tmplError;
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return tmplValue!;
	}

	if (wasTournError) {
		throw tournError;
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return tournValue!;
};
