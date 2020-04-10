"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ResolverRequest {
    constructor(database, table, resolver, trx, parent, args, context, auth, info) {
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
exports.ResolverRequest = ResolverRequest;
