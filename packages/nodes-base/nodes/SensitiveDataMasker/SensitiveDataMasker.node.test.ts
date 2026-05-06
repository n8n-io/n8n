import { SensitiveDataMasker } from './SensitiveDataMasker.node';
// Note : En situation réelle, on utilise les outils de test de n8n-workflow
// Ici, on simule la logique de transformation pour valider les Regex.

describe('SensitiveDataMasker Node', () => {
    const node = new SensitiveDataMasker();

    describe('Regex Validation', () => {
        const replacement = '[HIDDEN]';
        test('should have the correct display name', () => {
            expect(node.description.displayName).toBe('Sensitive Data Masker');
        });

        test('should have emails enabled by default', () => {
            // On cherche le paramètre "maskEmails" dans la description
            const maskEmailsProp = node.description.properties.find(p => p.name === 'maskEmails');
            expect(maskEmailsProp?.default).toBe(true);
        });

        test('should have IBAN disabled by default', () => {
            const maskIbanProp = node.description.properties.find(p => p.name === 'maskIban');
            expect(maskIbanProp?.default).toBe(false);
        });
        test('should mask various email formats', () => {
            const input = 'Contact: test@example.com, john.doe@sub.domain.org';
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const result = input.replace(emailRegex, replacement);
            expect(result).toBe('Contact: [HIDDEN], [HIDDEN]');
        });

        test('should mask complex IBANs correctly', () => {
            const input = 'FR: FR7630006000011234567890123 DE: DE89370400440532013000';
            const replacement = '[HIDDEN]';

            const ibanRegex = /\b[A-Z]{2}\d{2}[A-Z0-9 ]{10,30}\d\b/gi;

            const result = input.replace(ibanRegex, replacement);

            expect(result).toBe('FR: [HIDDEN] DE: [HIDDEN]');
        });

        test('should apply custom patterns', () => {
            const input = 'Access key: KEY-123456';
            const customPattern = 'KEY-\\d{6}';
            const dynamicRegex = new RegExp(customPattern, 'gi');
            const result = input.replace(dynamicRegex, replacement);
            expect(result).toBe('Access key: [HIDDEN]');
        });
        test('should mask various phone number formats', () => {
            const replacement = '[HIDDEN]';
            const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{1,4}(?:[-.\s]?\d{1,4}){2,6}/g;

            const cases = [
                { input: 'Call +33 1 42 92 81 00', expected: 'Call [HIDDEN]' },
                { input: 'Fixe: 01.42.92.81.00', expected: 'Fixe: [HIDDEN]' },
                { input: 'Mobile: 06-12-34-56-78', expected: 'Mobile: [HIDDEN]' },
                { input: 'US: +1 (800) 555-0199', expected: 'US: [HIDDEN]' }
            ];

            cases.forEach(({ input, expected }) => {
                const result = input.replace(phoneRegex, replacement);
                expect(result).toBe(expected);
            });
        });


    });
});

describe('Sensitive Data Masker - JSON Structure', () => {
    const replacement = '[HIDDEN]';
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Cette fonction simule la logique récursive de ton nœud
    function recursiveMask(obj: any): any {
        if (typeof obj === 'string') {
            return obj.replace(emailRegex, replacement);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => recursiveMask(item));
        }
        if (typeof obj === 'object' && obj !== null) {
            const maskedObj: any = {};
            for (const key in obj) {
                maskedObj[key] = recursiveMask(obj[key]);
            }

            return maskedObj;
        }
        return obj;
    }

    test('should traverse nested JSON and mask emails', () => {
        const inputJson = {
            level1: "contact@test.com",
            container: {
                level2: "admin@dev.io",
                list: ["user@web.com", "not-an-email"]
            },
            status: true,
            count: 42
        };

        const result = recursiveMask(inputJson);

        // Vérifications
        expect(result.level1).toBe('[HIDDEN]');
        expect(result.container.level2).toBe('[HIDDEN]');
        expect(result.container.list[0]).toBe('[HIDDEN]');
        expect(result.container.list[1]).toBe('not-an-email');
        expect(result.status).toBe(true); // Doit rester un boolean
        expect(result.count).toBe(42);    // Doit rester un nombre
    });
});