export class Isupport {
    private keys: any;

    constructor() {
        this.keys = {
            chantypes: '#',
            network: 'IRCd',
            prefix: new Map(),
        };
        this.keys.prefix.set('@', 'o');
        this.keys.prefix.set('+', 'v');
    }

    public has(key: string): boolean {
        return key in this.keys;
    }

    public get(key: string, def?: any): any {
        return this.keys[key] || def;
    }

    public set(key: string, value: any): void {
        this.keys[key] = value;
    }

    public injest(params: string[]): void {
        params.forEach(param => {
            // handle each param
        });
    }
}
