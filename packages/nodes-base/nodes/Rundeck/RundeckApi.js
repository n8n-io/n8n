import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export class RundeckApi {
    credentials;
    executeFunctions;
    constructor(executeFunctions) {
        this.executeFunctions = executeFunctions;
    }
    shouldValidateCertificates() {
        switch (this.credentials?.sslCertificateValidation) {
            case 'enabled':
                return true;
            case 'disabled':
                return false;
            default:
                return this.executeFunctions.getNode().typeVersion >= 1.1;
        }
    }
    async request(method, endpoint, body, query) {
        const credentialType = 'rundeckApi';
        const options = {
            rejectUnauthorized: this.shouldValidateCertificates(),
            method,
            qs: query,
            uri: this.credentials?.url + endpoint,
            body,
            json: true,
        };
        try {
            return await this.executeFunctions.helpers.requestWithAuthentication.call(this.executeFunctions, credentialType, options);
        }
        catch (error) {
            throw new NodeApiError(this.executeFunctions.getNode(), error);
        }
    }
    async init() {
        const credentials = await this.executeFunctions.getCredentials('rundeckApi');
        if (credentials === undefined) {
            throw new NodeOperationError(this.executeFunctions.getNode(), 'No credentials got returned!');
        }
        this.credentials = credentials;
    }
    async executeJob(jobId, args, filter) {
        let params = '';
        if (args) {
            for (const arg of args) {
                params += '-' + arg.name + ' ' + arg.value + ' ';
            }
        }
        const body = {
            argString: params,
        };
        const query = {};
        if (filter) {
            query.filter = filter;
        }
        return await this.request('POST', `/api/14/job/${jobId}/run`, body, query);
    }
    async getJobMetadata(jobId) {
        return await this.request('GET', `/api/18/job/${jobId}/info`, {}, {});
    }
}
//# sourceMappingURL=RundeckApi.js.map