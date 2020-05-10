"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        return __awaiter(this, void 0, void 0, function* () {
            this.before.forEach((event) => {
                event(request);
            });
            const result = yield this.resolver(request);
            this.after.forEach((event) => {
                event(request, result);
            });
            return result;
        });
    }
}
exports.Resolver = Resolver;
