import * as Knex from "knex";
import { Resolver } from "./resolver";
import { Table } from "./table";
export declare class ResolverRequest {
    database: Knex;
    table: Table;
    resolver: Resolver;
    trx?: Knex.Transaction;
    parent: any;
    args: any;
    context: any;
    auth: any;
    info: any;
    constructor(database: Knex, table: Table, resolver: Resolver, trx?: Knex.Transaction, parent?: any, args?: any, context?: any, auth?: any, info?: any);
}
