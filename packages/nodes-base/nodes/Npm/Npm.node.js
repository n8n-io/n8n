import { NodeConnectionTypes } from 'n8n-workflow';
import { distTagFields, distTagOperations } from './DistTagDescription';
import { packageFields, packageOperations } from './PackageDescription';
export class Npm {
    description = {
        displayName: 'Npm',
        name: 'npm',
        icon: 'file:npm.svg',
        group: ['input'],
        version: 1,
        subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
        description: 'Consume NPM registry API',
        defaults: {
            name: 'npm',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'npmApi',
                required: false,
            },
        ],
        requestDefaults: {
            baseURL: '={{ $credentials.registryUrl }}',
        },
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Package',
                        value: 'package',
                    },
                    {
                        name: 'Distribution Tag',
                        value: 'distTag',
                    },
                ],
                default: 'package',
            },
            ...packageOperations,
            ...packageFields,
            ...distTagOperations,
            ...distTagFields,
        ],
    };
}
//# sourceMappingURL=Npm.node.js.map