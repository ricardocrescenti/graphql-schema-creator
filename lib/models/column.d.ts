import { Resolver } from "./resolver";
import { Table } from "./table";
export declare class Column {
    table: Table;
    name: string;
    originalType: string;
    graphQLType: string;
    primaryKey: boolean;
    resolver?: Resolver;
    mutation?: Resolver;
    allowInput: boolean;
    constructor(table: Table, name: string, originalType?: string, options?: IColumnOptions);
    getTypeDef(forInputType: boolean): string;
    getGraphQLTypeDef(forInputType: boolean): string;
    private defineGraphQLType;
}
export interface IColumnOptions {
    primaryKey?: boolean;
    graphQLType?: string;
    allowInput?: boolean;
}
