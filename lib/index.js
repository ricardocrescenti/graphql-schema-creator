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
const apollo_server_express_1 = require("apollo-server-express");
const graphql_type_json_1 = require("graphql-type-json");
const column_1 = require("./models/column");
exports.Column = column_1.Column;
const foreign_key_1 = require("./models/foreign-key");
exports.ForeignKey = foreign_key_1.ForeignKey;
const resolver_1 = require("./models/resolver");
exports.Resolver = resolver_1.Resolver;
const resolver_request_1 = require("./models/resolver-request");
exports.ResolverRequest = resolver_request_1.ResolverRequest;
const table_1 = require("./models/table");
exports.Table = table_1.Table;
const unique_key_1 = require("./models/unique-key");
exports.UniqueKey = unique_key_1.UniqueKey;
class GraphQLSchema {
    /**
     * To initialize a GraphQLSchemaCreator, use `initialize()` static method
     * @database Knex reference to perform database queries and mutations
     */
    constructor(database, options) {
        /**
         * Map of loaded tables from database
         */
        this.tables = new Map();
        this.database = database;
        this.options = options;
    }
    /**
     * Initialize GraphQLSchemaCreator
     * @param database Knex reference to perform database queries and mutations
     * @param options Initialization options with filters, auth and interceptors
     */
    static initialize(database, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return __awaiter(this, void 0, void 0, function* () {
            /// initialize schema
            const schema = new GraphQLSchema(database, options || {});
            /// query database schema
            const queryTables = yield schema.getDatabaseSchema();
            /// create schema without foreign keys
            for (const row of queryTables) {
                /// create table 
                const typeName = `${(row.table_schema === 'public' ? '' : `${row.table_schema}_`)}${row.table_name}`;
                const table = (yield schema.applyInterceptor((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.interceptors) === null || _b === void 0 ? void 0 : _b.tables, [typeName, 'default'], new table_1.Table(schema, row.table_schema, row.table_name, normalizeName(typeName), row.table_columns, row.table_unique_keys)));
                if (table === null) {
                    continue;
                }
                /// add table in schema
                schema.tables.set(typeName, table);
                /// create default query
                const defaultQuery = new resolver_1.Resolver(table, table.tableName, 'query', [{ name: 'where', type: 'JSON', required: false }], table.typeName, true, (request) => {
                    return table.createDefaultQuery(database, request.trx, request.args.where);
                });
                table.queries[defaultQuery.name] = yield schema.applyInterceptor((_d = (_c = options) === null || _c === void 0 ? void 0 : _c.interceptors) === null || _d === void 0 ? void 0 : _d.queries, [defaultQuery.name, 'default'], defaultQuery);
                /// create arguments with primary keys to be used for update and delete mutation
                const primaryKeysArgs = [];
                table.primaryKeys.forEach((column) => {
                    primaryKeysArgs.push({ name: column.name, type: column.graphQLType, required: true });
                });
                /// if table does have primary keys, mutations are igonered
                if (primaryKeysArgs.length === 0) {
                    continue;
                }
                /// create default mutation (will be insert or update), will be used in foreign key mutations
                const defaultMutation = new resolver_1.Resolver(table, table.tableName, 'mutation', [{ name: 'data', type: `Input${table.typeName}`, required: true }], table.typeName, true, (request) => __awaiter(this, void 0, void 0, function* () {
                    return request.table.processMutation(schema, request, undefined);
                }));
                yield schema.applyInterceptor((_f = (_e = options) === null || _e === void 0 ? void 0 : _e.interceptors) === null || _f === void 0 ? void 0 : _f.mutations, [defaultMutation.name, 'mutation', 'mutations', 'default'], defaultMutation);
                table.mutations[defaultMutation.name] = defaultMutation;
                // create default insert mutation
                const defaultInsert = new resolver_1.Resolver(table, `insert_${table.tableName}`, 'insert', [{ name: 'data', type: `Input${table.typeName}`, required: true }], table.typeName, true, (request) => {
                    return request.table.processMutation(schema, request, null);
                });
                yield schema.applyInterceptor((_h = (_g = options) === null || _g === void 0 ? void 0 : _g.interceptors) === null || _h === void 0 ? void 0 : _h.mutations, [defaultInsert.name, 'insert', 'mutations', 'default'], defaultInsert);
                table.mutations[defaultInsert.name] = defaultInsert;
                // create default update mutation
                const defaultUpdate = new resolver_1.Resolver(table, `update_${table.tableName}`, 'update', primaryKeysArgs.concat({ name: 'data', type: `Input${table.typeName}`, required: true }), table.typeName, true, (request) => {
                    return request.table.processMutation(schema, request, request.table.createWhereJson(request.args));
                });
                yield schema.applyInterceptor((_k = (_j = options) === null || _j === void 0 ? void 0 : _j.interceptors) === null || _k === void 0 ? void 0 : _k.mutations, [defaultUpdate.name, 'update', 'mutations', 'default'], defaultUpdate);
                table.mutations[defaultUpdate.name] = defaultUpdate;
                // create default delete mutation
                const defaultDelete = new resolver_1.Resolver(table, `delete_${table.tableName}`, 'delete', primaryKeysArgs, table.typeName, true, (request) => {
                    return request.table.processDelete(schema, request);
                });
                yield schema.applyInterceptor((_m = (_l = options) === null || _l === void 0 ? void 0 : _l.interceptors) === null || _m === void 0 ? void 0 : _m.mutations, [defaultDelete.name, 'delete', 'mutations', 'default'], defaultDelete);
                table.mutations[defaultDelete.name] = defaultDelete;
            }
            /// add foreign keys in schema
            for (const row of queryTables) {
                if (!row.table_foreign_keys) {
                    continue;
                }
                /// get table and referenced table to add foreign key
                const typeName = `${(row.table_schema === 'public' ? '' : `${row.table_schema}_`)}${row.table_name}`;
                const table = schema.tables.get(typeName);
                if (!table) {
                    continue;
                }
                /// add foreign key on table and referenced table
                for (const foreignKey of row.table_foreign_keys) {
                    const referencedTypeName = `${(row.table_schema === 'public' ? '' : `${row.table_schema}_`)}${foreignKey.referenced_table}`;
                    const referencedTable = schema.tables.get(referencedTypeName);
                    if (!referencedTable) {
                        continue;
                    }
                    /// CURRENT TABLE
                    /// define foreign key name and associations columns
                    let foreignKeyName = '';
                    let associationColumns = new Map();
                    foreignKey.columns_associations.forEach((association) => {
                        associationColumns.set(association.column_name, association.referenced_column);
                        foreignKeyName += (foreignKeyName.length > 0 ? '_' : '') + association.column_name.replace(`_${association.referenced_column}`, '');
                        if (table.columns[association.column_name]) {
                            table.columns[association.column_name].exportTypeDef = false;
                        }
                    });
                    /// set resolver to get a single foreign key record in queries resolvers, in this
                    /// case, the current table have a column with id of referenced table row
                    table.columns[foreignKeyName] = new column_1.Column(table, foreignKeyName, '', { graphQLType: referencedTable.typeName });
                    table.columns[foreignKeyName].resolver = new foreign_key_1.ForeignKey(schema, table, table.columns[foreignKeyName], referencedTable, associationColumns, false);
                    /// set mutation function to insert/update row of single foreign key record associated
                    /// with row of current table
                    table.columns[foreignKeyName].mutation = referencedTable.mutations[referencedTypeName.toLowerCase()];
                    /// REFERENCED TABLE
                    /// define foreign key name and associations columns
                    foreignKeyName = (table.tableName + '_' + foreignKeyName);
                    associationColumns = new Map();
                    foreignKey.columns_associations.forEach((association) => {
                        associationColumns.set(association.referenced_column, association.column_name);
                    });
                    /// set foreign key resolver in referenced table, to allow to get an array of records
                    /// associated with then referenced table
                    referencedTable.columns[foreignKeyName] = new column_1.Column(referencedTable, foreignKeyName, '', { graphQLType: `[${table.typeName}]` });
                    referencedTable.columns[foreignKeyName].resolver = new foreign_key_1.ForeignKey(schema, referencedTable, referencedTable.columns[foreignKeyName], table, associationColumns, true);
                    /// set mutation function to insert/update an array of foreign key records associated
                    /// with row of referenced table
                    referencedTable.columns[foreignKeyName].mutation = table.mutations[table.tableName.toLowerCase()];
                }
            }
            // return schema with tables, columns, queries and mutations
            return schema;
        });
    }
    /**
     * Apply interceptors in creating tables, queries, and mutations, allowing the programmer to modify the default structure.
     * @param location Interceptor location in initialize options object
     * @param interceptorsName Name of initializers to be tested, only the first to be found will be used
     * @param object Object to be intercepted, which can be `Table` or `Resolver`
     * @param interceptors
     */
    applyInterceptor(location, interceptorsName, object) {
        return __awaiter(this, void 0, void 0, function* () {
            /// if location is null or undefined return original object
            if (!location) {
                return object;
            }
            /// Go through all interceptors and when it finds the first one, it executes it and returns the intercepted object.
            for (const interceptorName of interceptorsName) {
                /// get interceptor
                const interceptor = location[interceptorName];
                /// If is null will ignore this object in the GraphQL schema.
                if (interceptor === null) {
                    object = null;
                    break;
                }
                /// If `interceptorName` is in the list of interceptors, even if it is undefined,
                /// it will be validated because may be cases where the default is null (to ignore
                /// all) but a specific object must be added to the schema, then it will be 
                /// informed as undefined or have the interception function informed
                else if (Object.keys(location).indexOf(interceptorName) >= 0) {
                    /// If not undefined the function will be obtained to validate if the interceptor
                    /// will be executed.
                    if (interceptor) {
                        /// Runs the interceptor
                        const interceptedObject = yield interceptor(object);
                        /// If return null the object will be in the schema,
                        if (interceptedObject === null) {
                            object = null;
                        }
                        /// and if it returns anything other than undefined, the object will be 
                        /// replaced by the interceptor return
                        else if (interceptedObject !== undefined) {
                            object = interceptedObject;
                        }
                    }
                    break;
                }
            }
            return object;
        });
    }
    /**
     * Create the `ExecutableSchema` from` GraphQL`
     * @param options Options for creating ExecutableSchema allowing to modify `context` and format error returns using `formatError`
     */
    createExecutableSchema(options) {
        var _a;
        return {
            context: (context) => {
                if (options && options.context) {
                    options.context(context);
                }
                return context;
            },
            formatError: (((_a = options) === null || _a === void 0 ? void 0 : _a.formatError) ? options.formatError : (error) => {
                return {
                    extensions: {
                        code: error.extensions.code,
                        invalidArgs: error.extensions.invalidArgs
                    },
                    message: error.message,
                    path: error.path
                };
            }),
            resolvers: this.getResolvers(),
            typeDefs: apollo_server_express_1.gql `${this.getTypesDefs()}`
        };
    }
    /**
     * Query the tables and fields with primary key information in the database
     * @param filters Filters to apply when querying tables and fields
     */
    getDatabaseSchema() {
        return __awaiter(this, void 0, void 0, function* () {
            const filters = (this.options && this.options.filters ? this.options.filters : undefined);
            let columnsQuery = this.database({ c: 'information_schema.columns' })
                .select('c.table_schema', 'c.table_name', 'c.column_name', { column_type: 'c.udt_name' }, 'c.ordinal_position')
                .select(this.database.raw('(kcu.column_name is not null) as primary_key'))
                .joinRaw('left join information_schema.table_constraints tc on (tc.table_schema = c.table_schema and tc.table_name = c.table_name and tc.constraint_type = \'PRIMARY KEY\')')
                .joinRaw('left join information_schema.key_column_usage kcu on (kcu.constraint_name = tc.constraint_name and kcu.constraint_schema = tc.constraint_schema and kcu.constraint_name = tc.constraint_name and kcu.column_name = c.column_name)')
                .orderBy('c.table_schema').orderBy('c.table_name').orderBy('c.column_name');
            const foreignKeyQuery = this.database({ tc: 'information_schema.table_constraints' })
                .select('tc.table_schema', 'tc.table_name', 'kcu.constraint_name', { referenced_table: 'ccu.table_name' }, 'columns_associations')
                .joinRaw('inner join information_schema.key_column_usage kcu on (kcu.constraint_name = tc.constraint_name and kcu.constraint_schema = tc.constraint_schema and kcu.constraint_name = tc.constraint_name)')
                .joinRaw('inner join information_schema.constraint_column_usage ccu on (ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema)')
                .joinRaw(`inner join (select fkc.table_schema, fkc.table_name, fkc.constraint_name, json_agg(row_to_json(fkc)::jsonb - 'table_schema' - 'table_name' -  'constraint_name') as columns_associations
        from (select tc.table_schema, tc.table_name, kcu.constraint_name, kcu.column_name, ccu.column_name as referenced_column
          from information_schema.table_constraints tc
          inner join information_schema.key_column_usage kcu on (kcu.constraint_name = tc.constraint_name and kcu.constraint_schema = tc.constraint_schema and kcu.constraint_name = tc.constraint_name)
          inner join information_schema.constraint_column_usage ccu on (ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema)
          where tc.constraint_type = 'FOREIGN KEY') fkc
        group by fkc.table_schema, fkc.table_name, fkc.constraint_name
        order by fkc.table_schema, fkc.table_name, fkc.constraint_name) fkc on (fkc.table_schema = tc.table_schema and fkc.table_name = tc.table_name and fkc.constraint_name = kcu.constraint_name)`)
                .where('tc.constraint_type', 'FOREIGN KEY')
                .orderBy('tc.table_schema').orderBy('tc.table_name').orderBy('kcu.constraint_name');
            const uniqueKeyQuery = this.database({ tc: 'information_schema.table_constraints' })
                .select('tc.table_schema', 'tc.table_name', 'tc.constraint_name', 'columns')
                .joinRaw(`inner join (select unk.table_schema, unk.table_name, unk.constraint_name, json_agg(row_to_json(unk)::jsonb - 'table_schema' - 'table_name' -  'constraint_name') as columns
        from (select tc.table_schema, tc.table_name, kcu.constraint_name, kcu.column_name
          from information_schema.table_constraints tc
          inner join information_schema.key_column_usage kcu on (kcu.constraint_name = tc.constraint_name and kcu.constraint_schema = tc.constraint_schema and kcu.constraint_name = tc.constraint_name)
          where tc.constraint_type = 'UNIQUE') unk
        group by unk.table_schema, unk.table_name, unk.constraint_name
        order by unk.table_schema, unk.table_name, unk.constraint_name) unk on (unk.table_schema = tc.table_schema and unk.table_name = tc.table_name and unk.constraint_name = tc.constraint_name)`)
                .where('tc.constraint_type', 'UNIQUE')
                .orderBy('tc.table_schema').orderBy('tc.table_name').orderBy('tc.constraint_name');
            let tableQuery = this.database({ t: 'information_schema.tables' })
                .select('t.table_schema', 't.table_name', 'table_columns', 'table_foreign_keys', 'table_unique_keys');
            if (filters) {
                if (filters.ignoreTables) {
                    tableQuery = tableQuery.whereNotIn('t.table_name', filters.ignoreTables);
                }
                if (filters.ignoreColumns) {
                    columnsQuery = columnsQuery.whereNotIn('c.column_name', filters.ignoreColumns);
                }
                if (filters.schemas) {
                    tableQuery = tableQuery.whereIn('t.table_schema', filters.schemas);
                }
                if (filters.tables) {
                    tableQuery = tableQuery.where('t.table_name', filters.tables);
                }
                if (filters.tableCustomFilters) {
                    tableQuery = tableQuery.whereRaw(filters.tableCustomFilters);
                }
                if (filters.columnCustomFilters) {
                    columnsQuery = columnsQuery.whereRaw(filters.columnCustomFilters);
                }
            }
            tableQuery = tableQuery
                .joinRaw(`inner join (select c.table_schema, c.table_name, json_agg((row_to_json(c)::jsonb - 'table_schema' - 'table_name') order by c.ordinal_position) as table_columns
        from (${columnsQuery.toQuery()}) c
        group by c.table_schema, c.table_name) c on (c.table_schema = t.table_schema and c.table_name = t.table_name)`)
                .joinRaw(`left join (select fk.table_schema, fk.table_name, json_agg((row_to_json(fk)::jsonb - 'table_schema' - 'table_name') order by fk.constraint_name) as table_foreign_keys
        from (${foreignKeyQuery.toQuery()}) fk
        group by fk.table_schema, fk.table_name) fk on (fk.table_schema = t.table_schema and fk.table_name = t.table_name)`)
                .joinRaw(`left join (select uk.table_schema, uk.table_name, json_agg((row_to_json(uk)::jsonb - 'table_schema' - 'table_name') order by uk.constraint_name) as table_unique_keys
        from (${uniqueKeyQuery.toQuery()}) uk
        group by uk.table_schema, uk.table_name) uk on (uk.table_schema = t.table_schema and uk.table_name = t.table_name)`)
                .orderBy('t.table_schema')
                .orderBy('t.table_name');
            return yield tableQuery;
        });
    }
    /**
     * Generate and get types definitions of table ,queries, and mutations
     */
    getTypesDefs() {
        const typeDefs = [
            'scalar Date',
            'scalar JSON'
        ];
        const tablesArray = Array.from(this.tables.values());
        const models = reduceArray(tablesArray, '\n', (table) => {
            return `type ${table.typeName} {\n${table.getColumnsTypeDefs(false)}\n}\n` +
                `input Input${table.typeName} {\n${table.getColumnsTypeDefs(true)}\n}\n`;
        });
        if (models.length > 0) {
            typeDefs.push(`\n${models}`);
        }
        const queries = reduceArray(tablesArray, '\n', (table) => {
            return `${table.getResolversTypeDefs(table.queries)}`;
        });
        if (queries.length > 0) {
            typeDefs.push(`\ntype Query {\n${queries}\n}`);
        }
        const mutations = reduceArray(tablesArray, '\n', (table) => {
            return `${table.getResolversTypeDefs(table.mutations)}`;
        });
        if (mutations.length > 0) {
            typeDefs.push(`\ntype Mutation {\n${mutations}\n}`);
        }
        const resultTypeDefs = reduceArray(typeDefs, '\n', (item) => {
            return item;
        });
        return resultTypeDefs;
    }
    /**
     * Generate and get query and mutation resolvers
     */
    getResolvers() {
        // initialize resolver object structure
        const resolvers = {
            JSON: graphql_type_json_1.GraphQLJSON,
            Mutation: {},
            Query: {},
        };
        // get queries resolvers
        this.tables.forEach((table) => {
            Object.keys(table.queries).map((queryName) => {
                if (table.queries[queryName]) {
                    resolvers.Query[queryName] = this.getResolver(table.queries[queryName]);
                }
            });
        });
        // if does not have queries resolvers, remove it
        if (Object.keys(resolvers.Query).length === 0) {
            delete (resolvers.Query);
        }
        // get mutations resolvers
        this.tables.forEach((table) => {
            Object.keys(table.mutations).map((mutationName) => {
                if (table.mutations[mutationName]) {
                    resolvers.Mutation[mutationName] = this.getResolver(table.mutations[mutationName]);
                }
            });
        });
        // if does not have queries resolvers, remove it
        if (Object.keys(resolvers.Mutation).length === 0) {
            delete (resolvers.Mutation);
        }
        // get resolvers for relations
        this.tables.forEach((table) => {
            Object.keys(table.columns).map((columnName) => {
                // check if column have a resolver function
                const resolver = table.columns[columnName].resolver;
                if (resolver) {
                    // get table type def, if not, will be created with table type name
                    let tableResolver = resolvers[table.typeName];
                    if (!tableResolver) {
                        tableResolver = {};
                        resolvers[table.typeName] = tableResolver;
                    }
                    // set resolver for column
                    tableResolver[resolver.name] = this.getResolver(resolver);
                }
            });
        });
        return resolvers;
    }
    /**
     * Method used by `_getResolvers` to get the final method of a specific resolver by applying permission checking
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` that will be prepared and returned
     */
    getResolver(resolver) {
        // if resolver is null or undefined return null
        if (!resolver) {
            return null;
        }
        // get validate permission function to check permission inside of resolver method
        const validatePermission = this.getPermissionValidation(resolver);
        // create global resolver
        return (parent, args, context, info) => __awaiter(this, void 0, void 0, function* () {
            // create a resolver request to minimize parameters
            const request = { database: this.database, table: resolver.table, resolver, trx: undefined, parent, args, context, auth: context.req.auth, info };
            if (!info.path.prev) {
                // check permission to access this resolver
                if (validatePermission) {
                    const validated = yield validatePermission(request);
                    if (!validated) {
                        throw new apollo_server_express_1.AuthenticationError('You do not have permission to access this feature.');
                    }
                }
            }
            if (context.trx) {
                request.trx = context.trx;
                return resolver.execute(request);
            }
            // initialize transation to execute resolver
            return yield this.database.transaction((trx) => __awaiter(this, void 0, void 0, function* () {
                // get the transaction to pass to the resolver
                context.trx = trx;
                request.trx = trx;
                // return resolver function
                return resolver.execute(request);
            }));
        });
    }
    /**
     * Get permission validation associated with `Resolve`
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` which will be used to query the authentication setting and return the permission validation function
     */
    getPermissionValidation(resolver) {
        /// get auth configuration to be used in resolvers
        const auth = (this.options ? this.options.auth : undefined);
        /// check if resolver is a query or mutation to define the location that the
        /// authentication setting will be queried
        if (resolver.type === 'query') {
            return this.getQueryPermission(resolver, auth);
        }
        else {
            return this.getMutationPermission(resolver, auth);
        }
    }
    /**
     * Query the permission validation method of a `Resolver` query
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` which will be used to query the authentication setting and return the permission validation function
     * @param auth Auth object reference found in schema initialization options
     */
    getQueryPermission(resolver, auth) {
        if (!auth) {
            return undefined;
        }
        const tableName = resolver.table.tableName;
        // table > query_name
        if (auth[tableName] && auth[tableName][resolver.name]) {
            return auth[tableName][resolver.name];
        }
        // table > queries
        else if (auth[tableName] && auth[tableName].queries) {
            return auth[tableName].queries;
        }
        // table > default
        else if (auth[tableName] && auth[tableName].default) {
            return auth[tableName].default;
        }
        // queries
        else if (auth.queries) {
            return auth.queries;
        }
        // default
        else if (auth.default) {
            return auth.default;
        }
        return null;
    }
    /**
     * Query the permission validation method of a `Resolver` mutation
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` which will be used to query the authentication setting and return the permission validation function
     * @param auth Auth object reference found in schema initialization options
     */
    getMutationPermission(resolver, auth) {
        if (!auth) {
            return undefined;
        }
        const tableName = resolver.table.tableName;
        // table > mutation_name
        if (auth[tableName] && auth[tableName][resolver.name]) {
            return auth[tableName][resolver.name];
        }
        // table > mutation_type (insert, update, delete)
        else if (auth[tableName] && auth[tableName][resolver.type]) {
            return auth[tableName][resolver.type];
        }
        // table > mutations
        else if (auth[tableName] && auth[tableName].mutations) {
            return auth[tableName].mutations;
        }
        // table > default
        else if (auth[tableName] && auth[tableName].default) {
            return auth[tableName].default;
        }
        // mutation_type (insert, update, delete)
        else if (auth[resolver.type]) {
            return auth[resolver.type];
        }
        // mutations
        else if (auth.mutations) {
            return auth.mutations;
        }
        // default
        else if (auth.default) {
            return auth.default;
        }
        return null;
    }
}
exports.GraphQLSchema = GraphQLSchema;
function normalizeName(name) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
    let underscore = name.indexOf('_') + 1;
    while (underscore > 0) {
        name = name.replace('_' + name.charAt(underscore), name.charAt(underscore).toUpperCase());
        underscore = name.indexOf('_') + 1;
    }
    return name;
}
exports.normalizeName = normalizeName;
function reduceArray(array, separator, convert) {
    if (array.length === 0) {
        return '';
    }
    return array
        .map((item) => convert(item))
        .reduce((previousValue, currentValue, currentIndex, array) => {
        if (currentValue.length > 0) {
            return (currentIndex > 0 ? previousValue + separator : '') + currentValue;
        }
        else {
            return previousValue;
        }
    });
}
exports.reduceArray = reduceArray;
