import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

export class SensitiveDataMasker implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Sensitive Data Masker',
        name: 'sensitiveDataMasker',
        icon: 'file:SensitiveDataMasker.icon.svg',
        group: ['transform'],
        version: 1,
        description: 'Masque les emails, IBAN et numéros de téléphone',
        defaults: { name: 'Sensitive Data Masker' },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Mode',
                name: 'mode',
                type: 'options',
                options: [
                    { name: 'JSON (All Properties)', value: 'json' },
                    { name: 'Binary File', value: 'binary' },
                ],
                default: 'json',
                description: 'Le type de donnée en entrée',
            },
            {
                displayName: 'Binary Property Name',
                name: 'binaryPropertyName',
                type: 'string',
                displayOptions: { show: { mode: ['binary'] } },
                default: 'data',
                description: 'Le nom du champ binaire contenant le fichier (ex: data)',
            },
            {
                displayName: 'Replacement Text',
                name: 'replacementText',
                type: 'string',
                default: '[HIDDEN]',
                description: 'Le texte qui remplacera les données sensibles détectées',
            },
            {
                displayName: 'Mask Emails',
                name: 'maskEmails',
                type: 'boolean',
                default: true,
            },
            {
                displayName: 'Mask Phone Numbers',
                name: 'maskPhones',
                type: 'boolean',
                default: true,
            },
            {
                displayName: 'Mask IBAN',
                name: 'maskIban',
                type: 'boolean',
                default: false,
                description: 'Détecte et masque les numéros de compte bancaire internationaux (IBAN)',
            },
            {
                displayName: 'Custom Patterns',
                name: 'customPatterns',
                placeholder: 'Add Pattern',
                type: 'fixedCollection',
                default: {},
                typeOptions: { multipleValues: true },
                options: [
                    {
                        name: 'patterns',
                        displayName: 'Patterns',
                        values: [
                            {
                                displayName: 'Regex / Text',
                                name: 'pattern',
                                type: 'string',
                                default: '',
                                description: "Entrez un texte spécifique ou une expression régulière à masquer.",
                            },
                        ],
                    },
                ],
            },
        ],
    };

    /**
     * Recursive function to traverse and mask the JSON data
     */
    private static recursiveMask(obj: any, replacement: string, regexList: RegExp[]): any {
        if (typeof obj === 'string') {
            let maskedString = obj;
            for (const regex of regexList) {
                maskedString = maskedString.replace(regex, replacement);
            }
            return maskedString;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => SensitiveDataMasker.recursiveMask(item, replacement, regexList));
        }

        if (typeof obj === 'object' && obj !== null) {
            const newObj: any = {};
            for (const key in obj) {
                newObj[key] = SensitiveDataMasker.recursiveMask(obj[key], replacement, regexList);
            }
            return newObj;
        }

        return obj;
    }

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const mode = this.getNodeParameter('mode', i, 'json') as string;
                const replacementText = this.getNodeParameter('replacementText', i, '[HIDDEN]') as string;
                const maskEmails = this.getNodeParameter('maskEmails', i, false) as boolean;
                const maskPhones = this.getNodeParameter('maskPhones', i, false) as boolean;
                const maskIban = this.getNodeParameter('maskIban', i, false) as boolean;
                const customPatterns = this.getNodeParameter('customPatterns', i, {}) as any;

                // Building the list of Regex patterns to apply
                const regexList: RegExp[] = [];
                if (maskEmails) regexList.push(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                if (maskPhones) regexList.push(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{1,4}(?:[-.\s]?\d{1,4}){2,6}/g);
                if (maskIban) regexList.push(/\b[A-Z]{2}\d{2}[A-Z0-9\s]{10,30}\d\b/gi);

                if (customPatterns.patterns) {
                    for (const item of customPatterns.patterns) {
                        if (item.pattern) regexList.push(new RegExp(item.pattern, 'gi'));
                    }
                }

                if (mode === 'binary') {
                    // --- BINARY TREATMENT ---
                    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
                    if (items[i].binary && items[i].binary![binaryPropertyName]) {
                        const binaryData = items[i].binary![binaryPropertyName];
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                        let content = buffer.toString('utf8');

                        for (const regex of regexList) {
                            content = content.replace(regex, replacementText);
                        }

                        const maskedBinary = await this.helpers.prepareBinaryData(
                            Buffer.from(content, 'utf8'),
                            binaryData.fileName,
                            binaryData.mimeType,
                        );

                        returnData.push({
                            json: { ...items[i].json, maskedAt: new Date().toISOString() },
                            binary: { ...items[i].binary, [binaryPropertyName]: maskedBinary },
                            pairedItem: { item: i },
                        });
                    }
                } else {
                    // --- JSON TREATMENT ---
                    const inputJson = items[i].json;
                    const maskedJson = SensitiveDataMasker.recursiveMask(inputJson, replacementText, regexList);

                    returnData.push({
                        json: maskedJson,
                        pairedItem: { item: i },
                    });
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}