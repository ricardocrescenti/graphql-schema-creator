"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class Resolver {
    constructor(table, name, type, args, returnType, returnMany, resolver) {
        this.before = [];
        this.after = [];
        this.table = table;
        this.name = name;
        this.type = type;
        this.args = args;
        this.returnType = (returnMany ? `[${returnType}]` : returnType);
        this.returnMany = returnMany;
        this.resolver = resolver;
    }
    getArgsDefs() {
        if (this.args && this.args.length > 0) {
            return '(' + __1.reduceArray(this.args, ', ', (arg) => {
                return `${arg.name}: ${arg.type}${arg.required ? '!' : ''}`;
            }) + ')';
        }
        return '';
    }
    execute(request) {
        this.before.forEach((event) => {
            event(request);
        });
        const result = this.resolver(request);
        this.after.forEach((event) => {
            event(request, result);
        });
        return result;
    }
}
exports.Resolver = Resolver;
