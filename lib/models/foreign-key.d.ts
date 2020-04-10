import { GraphQLSchema } from "..";
import { Column } from "./column";
import { Resolver } from "./resolver";
import { Table } from "./table";
export declare class ForeignKey extends Resolver {
    column: Column;
    referencedTable: Table;
    columns: Map<string, string>;
    constructor(schema: GraphQLSchema, table: Table, column: Column, referencedTable: Table, columns: Map<string, string>, hasMany: boolean);
}
