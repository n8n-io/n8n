import { NodesConfig } from '@n8n/config';
import { Container } from '@n8n/di';
const { isolateInstances, MockIsolate } = vi.hoisted(() => {
    const instances = [];
    class Isolate {
        isDisposed = false;
        memoryLimit;
        constructor(options) {
            this.memoryLimit = options.memoryLimit;
            instances.push(this);
        }
        async compileScript() {
            return {
                async run() { },
            };
        }
        async createContext() {
            return {
                release() { },
            };
        }
        dispose() {
            this.isDisposed = true;
        }
    }
    return { isolateInstances: instances, MockIsolate: Isolate };
});
vi.mock('isolated-vm', () => ({
    default: {
        Isolate: MockIsolate,
    },
}));
describe('combineBySql sandbox config', () => {
    beforeEach(() => {
        Container.reset();
        vi.resetModules();
        isolateInstances.length = 0;
    });
    afterEach(async () => {
        const { resetSandboxCache } = await import('../../v3/helpers/sandbox-utils');
        resetSandboxCache();
        Container.reset();
    });
    it('passes the configured memory limit to isolated-vm', async () => {
        Container.set(NodesConfig, { mergeSqlSandboxMemoryLimitMb: 128 });
        const { createSandboxContext } = await import('../../v3/helpers/sandbox-utils');
        const context = await createSandboxContext();
        context.release();
        expect(isolateInstances[0]?.memoryLimit).toBe(128);
    });
});
//# sourceMappingURL=sandbox-utils.config.test.js.map