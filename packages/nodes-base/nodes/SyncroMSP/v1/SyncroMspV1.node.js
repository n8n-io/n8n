import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { loadOptions } from './methods';
import { validateCredentials } from './transport';
export class SyncroMspV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = {
        loadOptions,
        credentialTest: {
            async syncroMspApiCredentialTest(credential) {
                try {
                    await validateCredentials.call(this, credential.data);
                }
                catch (error) {
                    if (error.statusCode === 401) {
                        return {
                            status: 'Error',
                            message: 'The API Key included in the request is invalid',
                        };
                    }
                }
                return {
                    status: 'OK',
                    message: 'Connection successful!',
                };
            },
        },
    };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=SyncroMspV1.node.js.map