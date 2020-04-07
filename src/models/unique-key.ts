import { Column } from "./column";
import { Table } from "./table";

export class UniqueKey {
    public table: Table;
    public constraintName: string;
    public columns: Column[] = [];
  
    constructor(table: Table, constraintName: string, columns: string[]) {
        this.table = table;
        this.constraintName = constraintName;

        columns.forEach(({ column_name }: any) => {
            let column: Column = table.columns[column_name];
            if (!column) {
                column = new Column(table, column_name, undefined);
            }
            this.columns.push(table.columns[column_name]);
        });
    }
}