import { testWorkflows, getWorkflowFilenames } from '../../../test/nodes/Helpers';
const workflows = getWorkflowFilenames(__dirname);

describe('Execute Wait Node', () => {
	let timer: NodeJS.Timer;
	const { clearInterval, setInterval } = global;

	beforeAll(() => {
		timer = setInterval(() => jest.advanceTimersByTime(1000), 10);
		jest.useFakeTimers();
	});

	afterAll(() => {
		clearInterval(timer);
		jest.useRealTimers();
	});

	testWorkflows(workflows);
});
