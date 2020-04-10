import { Column } from "./column";
import { Table } from "./table";
export declare class UniqueKey {
    table: Table;
    constraintName: string;
    columns: Column[];
    constructor(table: Table, constraintName: string, columns: string[]);
}
