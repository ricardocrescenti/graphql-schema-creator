"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const column_1 = require("./column");
class UniqueKey {
    constructor(table, constraintName, columns) {
        this.columns = [];
        this.table = table;
        this.constraintName = constraintName;
        columns.forEach(({ column_name }) => {
            let column = table.columns[column_name];
            if (!column) {
                column = new column_1.Column(table, column_name, undefined);
            }
            this.columns.push(table.columns[column_name]);
        });
    }
}
exports.UniqueKey = UniqueKey;
