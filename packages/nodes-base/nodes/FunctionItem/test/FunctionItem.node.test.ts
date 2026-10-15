import type { IExecuteFunctions } from 'n8n-workflow';
import { CONSOLE_OUTPUT_REDACTED_MESSAGE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { FunctionItem } from '../FunctionItem.node';

const CODE = "console.log('SECRET-VALUE'); return { ok: true };";

function makeContext(redact: boolean) {
	const context = mock<IExecuteFunctions>();
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getMode.mockReturnValue('trigger');
	context.getNodeParameter.mockReturnValue(CODE);
	context.isConsoleOutputRedacted.mockReturnValue(redact);
	context.getWorkflowDataProxy.mockReturnValue({} as never);
	context.continueOnFail.mockReturnValue(false);
	return context;
}

describe('FunctionItem node console redaction', () => {
	let logSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
	});

	it('emits only the redaction marker on stdout when the run is redacted', async () => {
		await new FunctionItem().execute.call(makeContext(true));

		expect(logSpy).toHaveBeenCalledWith(CONSOLE_OUTPUT_REDACTED_MESSAGE);
		expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('SECRET-VALUE'));
	});

	it('keeps raw stdout output when the run is not redacted', async () => {
		await new FunctionItem().execute.call(makeContext(false));

		expect(logSpy).toHaveBeenCalledWith('SECRET-VALUE');
	});
});
