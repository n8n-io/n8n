import { CONSOLE_OUTPUT_REDACTED_MESSAGE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import { Function as FunctionNode } from '../Function.node';
const CODE = "console.log('SECRET-VALUE'); return items;";
function makeContext(redact) {
    const context = mock();
    context.getInputData.mockReturnValue([{ json: {} }]);
    context.getMode.mockReturnValue('trigger');
    context.getNodeParameter.mockReturnValue(CODE);
    context.isConsoleOutputRedacted.mockReturnValue(redact);
    context.getWorkflowDataProxy.mockReturnValue({});
    context.continueOnFail.mockReturnValue(false);
    const helpers = mock();
    helpers.normalizeItems.mockImplementation((items) => items);
    context.helpers = helpers;
    return context;
}
describe('Function node console redaction', () => {
    let logSpy;
    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    });
    afterEach(() => {
        logSpy.mockRestore();
    });
    it('emits only the redaction marker on stdout when the run is redacted', async () => {
        await new FunctionNode().execute.call(makeContext(true));
        expect(logSpy).toHaveBeenCalledWith(CONSOLE_OUTPUT_REDACTED_MESSAGE);
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('SECRET-VALUE'));
    });
    it('keeps raw stdout output when the run is not redacted', async () => {
        await new FunctionNode().execute.call(makeContext(false));
        expect(logSpy).toHaveBeenCalledWith('SECRET-VALUE');
    });
});
//# sourceMappingURL=Function.node.test.js.map