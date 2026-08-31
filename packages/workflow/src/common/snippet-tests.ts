import isEqual from 'lodash/isEqual';

import { bindSnippets, SNIPPETS_PROXY_KEY, evaluateSnippetExpression } from './snippets';
import { Expression } from '../expression';
import { sanitizer, sanitizerName } from '../expression-sandboxing';
import { extend, extendOptional } from '../extensions';
import { extendedFunctions } from '../extensions/extended-functions';
import type { SnippetSources, SnippetTestCase, IDataObject } from '../interfaces';

export interface SnippetTestResult {
	passed: boolean;
	/** Compile or runtime error, when one was thrown */
	error?: string;
	/** What the test expression (left side) evaluated to */
	value?: unknown;
	/** What the expected expression (right side) evaluated to */
	expected?: unknown;
}

/**
 * Runs snippet unit tests: each test is a single expression evaluated in
 * the same sandboxed context snippets run in, and passes when it returns a
 * truthy value. Runs wherever the legacy expression pipeline runs, including
 * the browser.
 */
export function runSnippetTests(
	sources: SnippetSources,
	tests: SnippetTestCase[],
): SnippetTestResult[] {
	const data: IDataObject = {};
	Expression.initializeGlobalContext(data);
	data.extend = extend;
	data.extendOptional = extendOptional;
	Object.assign(data, extendedFunctions);
	Object.defineProperty(data, sanitizerName, { value: sanitizer, writable: false });
	Object.assign(data, { [SNIPPETS_PROXY_KEY]: sources });
	bindSnippets(data);

	return tests.map(({ code, expected }) => {
		try {
			const value = evaluateSnippetExpression(code, data);
			const expectedValue = evaluateSnippetExpression(expected, data);
			return { passed: isEqual(value, expectedValue), value, expected: expectedValue };
		} catch (error) {
			return { passed: false, error: (error as Error).message };
		}
	});
}
