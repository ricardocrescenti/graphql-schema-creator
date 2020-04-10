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
const resolver_1 = require("./resolver");
class ForeignKey extends resolver_1.Resolver {
    constructor(schema, table, column, referencedTable, columns, hasMany) {
        let returnType = referencedTable.typeName;
        if (hasMany) {
            returnType = `[${returnType}]`;
        }
        const resolver = (request) => __awaiter(this, void 0, void 0, function* () {
            /// if the column is already entered in the parent column, do not query again, and
            /// return de value informed in column
            if (request.parent[column.name]) {
                return request.parent[column.name];
            }
            /// But if the column is not entered in the parent, a database query will be made
            /// to query the relationship.
            let query = referencedTable.createDefaultQuery(schema.database);
            /// Add the conditions to make the relationship between the tables.
            columns.forEach((key, value) => {
                query = query.where(key, request.parent[value]);
            });
            /// Get and return query result, if not many, return first value or null, 
            /// otherwise return an array
            const result = yield query;
            return (hasMany ? result : (result.length > 0 ? result[0] : null));
        });
        super(table, column.name, 'foreign_key', [], returnType, hasMany, resolver);
        this.column = column;
        this.referencedTable = referencedTable;
        this.columns = columns;
    }
}
exports.ForeignKey = ForeignKey;
