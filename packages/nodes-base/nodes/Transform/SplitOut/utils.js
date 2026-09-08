import { fieldNotFoundHint } from '../utils/utils';
export class FieldsTracker {
    fields = {};
    add(key) {
        if (this.fields[key] === undefined) {
            this.fields[key] = false;
        }
    }
    update(key, value) {
        if (!this.fields[key] && value) {
            this.fields[key] = true;
        }
    }
    getHints() {
        const hints = [];
        for (const [field, value] of Object.entries(this.fields)) {
            if (!value) {
                hints.push(fieldNotFoundHint(field));
            }
        }
        return hints;
    }
}
//# sourceMappingURL=utils.js.map