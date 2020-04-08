import * as Knex from "knex";
import { Resolver } from "./resolver";
import { Table } from "./table";

export class ResolverRequest {
    public database: Knex;
    public table: Table;
    public resolver: Resolver;
    public trx?: Knex.Transaction;
    public parent: any;
    public args: any;
    public context: any;
    public auth: any;
    public info: any;
  
    constructor(database: Knex, table: Table, resolver: Resolver, trx?: Knex.Transaction, parent?: any, args?: any, context?: any, auth?: any, info?: any) {
        this.database = database;
        this.table = table;
        this.resolver = resolver;
        this.trx = trx;
        this.parent = parent;
        this.args = args;
        this.context = context;
        this.auth = auth;
        this.info = info;
    }
  }