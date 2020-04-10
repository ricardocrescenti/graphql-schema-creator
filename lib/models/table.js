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
const knex_json_where_1 = require("knex-json-where");
const __1 = require("..");
const column_1 = require("./column");
const foreign_key_1 = require("./foreign-key");
const unique_key_1 = require("./unique-key");
class Table {
    constructor(schema, tableSchema, tableName, typeName, tableColumns, uniqueKeys) {
        this.selectFields = ['*'];
        this.columns = {};
        this.primaryKeys = [];
        this.uniqueKeys = [];
        this.ordination = [];
        this.queries = {};
        this.mutations = {};
        this.beforeInsert = [];
        this.afterInsert = [];
        this.beforeUpdate = [];
        this.afterUpdate = [];
        this.beforeDelete = [];
        this.afterDelete = [];
        this.schema = schema;
        this.tableSchema = tableSchema;
        this.tableName = tableName;
        this.typeName = typeName;
        tableColumns.forEach((tableColumn) => {
            const column = new column_1.Column(this, tableColumn.column_name, tableColumn.column_type, tableColumn.primary_key);
            this.columns[column.name] = column;
            if (column.primaryKey) {
                this.primaryKeys.push(column);
                this.ordination.push(column.name);
            }
        });
        if (uniqueKeys) {
            uniqueKeys.forEach((item) => {
                this.uniqueKeys.push(new unique_key_1.UniqueKey(this, item.constraint_name, item.columns));
            });
        }
        this.defaultQuery = schema.database
            .withSchema(this.tableSchema)
            .table(this.tableName)
            .select(this.selectFields);
    }
    getColumnsTypeDefs(forInputType) {
        return __1.reduceArray(Object.keys(this.columns), '\n', (columnName) => {
            const column = this.columns[columnName];
            if (!column || (forInputType && !column.allowInput)) {
                return '';
            }
            return `\t${column.getTypeDef(forInputType)}`;
        });
    }
    getResolversTypeDefs(resolvers) {
        return __1.reduceArray(Object.keys(resolvers), '\n', (queryName) => {
            const resolver = resolvers[queryName];
            if (!resolver) {
                return '';
            }
            return `\t${queryName}${resolver.getArgsDefs()}: ${resolver.returnType}`;
        });
    }
    createDefaultQuery(db, trx, where) {
        let query = this.defaultQuery.clone();
        if (where) {
            query = query.where(knex_json_where_1.jsonWhere(where));
        }
        if (trx) {
            query = query.transacting(trx);
        }
        this.ordination.forEach(columnName => {
            query = query.orderBy(columnName);
        });
        return query;
    }
    createWhereJson(values, columns) {
        if (!columns) {
            columns = this.primaryKeys;
        }
        let where = null;
        columns.forEach((column) => {
            if (values[column.name]) {
                if (!where) {
                    where = {};
                }
                where[column.name] = {
                    _eq: values[column.name]
                };
            }
            else {
                if (where) {
                    throw new Error('You must enter all primary or unique keys');
                }
            }
        });
        return where;
    }
    processMutation(schema, request, where) {
        return __awaiter(this, void 0, void 0, function* () {
            const foreingKeysAfter = yield request.table.processForeignKeyMutation(request);
            if (where === undefined) {
                where = request.table.createWhereJson(request.args.data);
                /// if dont get 'where' by primary key, case this mutation will be called by other
                /// mutation will be tried to create a 'where' json by unique keys.
                if (!where && request.parent && request.table.uniqueKeys.length > 0) {
                    for (const uniqueKeys of request.table.uniqueKeys) {
                        // uniqueKeys.columns.forEach((column: Column) => {
                        // });
                        where = request.table.createWhereJson(request.args.data, uniqueKeys.columns);
                        if (where) {
                            break;
                        }
                    }
                }
            }
            let currentRecord = (where ? yield request.table.createDefaultQuery(request.database, request.trx, where) : null);
            if (currentRecord && currentRecord.length > 0) {
                yield this.processTableEvents(request.table.beforeUpdate, (event) => event(request, currentRecord[0]));
                currentRecord = yield request.table.createDefaultUpdate(request.database, request.trx, where, request.args.data);
                yield this.processTableEvents(request.table.afterUpdate, (event) => event(request, currentRecord));
            }
            else {
                yield this.processTableEvents(request.table.beforeInsert, (event) => event(request));
                currentRecord = yield request.table.createDefaultInsert(request.database, request.trx, request.args.data);
                if (currentRecord && currentRecord.length > 0) {
                    yield this.processTableEvents(request.table.afterInsert, (event) => event(request, currentRecord[0]));
                }
            }
            // if no result throw error
            if (!currentRecord || currentRecord.length === 0) {
                throw new Error('No records returned in mutation ' + request.resolver.name);
            }
            yield request.table.processChildsForeignKeyMutation(request, currentRecord[0], foreingKeysAfter);
            return currentRecord;
        });
    }
    processDelete(schema, request) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            yield schema.applyInterceptor((_c = (_b = (_a = schema) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.interceptors) === null || _c === void 0 ? void 0 : _c.mutations, [request.resolver.name, 'delete', 'mutation', 'default'], request);
            const where = request.table.createWhereJson(request.args.data);
            const currentRecord = (where ? yield request.table.createDefaultQuery(request.database, request.trx, where) : null);
            if (currentRecord && currentRecord.length > 0) {
                yield this.processTableEvents(request.table.beforeDelete, (event) => event(request, currentRecord[0]));
                const deletedRecord = request.database
                    .withSchema(request.table.tableSchema)
                    .table(request.table.tableName)
                    .transacting(request.trx)
                    .where(knex_json_where_1.jsonWhere(where))
                    .delete()
                    .returning(request.table.selectFields);
                // if no result throw error
                if (!deletedRecord || deletedRecord.length === 0) {
                    throw new Error('No record deleted in mutation ' + request.resolver.name);
                }
                yield this.processTableEvents(request.table.afterDelete, (event) => event(request, currentRecord[0]));
            }
            return currentRecord;
        });
    }
    createDefaultInsert(db, trx, data) {
        return db
            .withSchema(this.tableSchema)
            .table(this.tableName)
            .transacting(trx)
            .returning(this.selectFields)
            .insert(data);
    }
    createDefaultUpdate(db, trx, where, data) {
        let update = db
            .withSchema(this.tableSchema)
            .table(this.tableName)
            .transacting(trx)
            .update(data)
            .returning(this.selectFields);
        if (where) {
            update = update.where(knex_json_where_1.jsonWhere(where));
        }
        return update;
    }
    processForeignKeyMutation(request) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            /// Map to store all foreign keys to be executed after inserting / updating current record
            const foreingKeysAfter = new Map();
            /// go through all fields and check if have any foreign key fields so you can insert the record before the main record.
            for (const columnName of Object.keys(request.args.data)) {
                const column = request.table.columns[columnName];
                if (column && column.resolver && column.resolver instanceof foreign_key_1.ForeignKey) {
                    const foreignKey = column.resolver;
                    if (!foreignKey.returnMany) {
                        /// call foreign key mutation passing args and parent data
                        const foreignKeyResult = yield ((_b = (_a = column) === null || _a === void 0 ? void 0 : _a.mutation) === null || _b === void 0 ? void 0 : _b.execute(Object.assign(Object.assign({}, request), { args: { data: request.args.data[columnName] }, parent: request.args.data, resolver: column.mutation, table: column.mutation.table })));
                        /// Seta os valores do registro inserido/atualizado da chave estrangeira no dado atual
                        const foreignKey = column.resolver;
                        foreignKey.columns.forEach((value, key) => {
                            request.args.data[key] = foreignKeyResult[0][value];
                        });
                    }
                    else {
                        /// store foreign key will need to execute after mutate current record
                        foreingKeysAfter.set(columnName, request.args.data[columnName]);
                    }
                    /// Removes foreign key column to leave only columns to be inserted into database
                    delete (request.args.data[columnName]);
                }
            }
            return foreingKeysAfter;
        });
    }
    processChildsForeignKeyMutation(request, data, foreingKeysAfter) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (foreingKeysAfter.size > 0) {
                /// go through all fields and check if have any foreign key fields so you can insert the 
                /// record before the main record.
                for (const foreignKeyAfter of foreingKeysAfter) {
                    /// get column of foreign key
                    const column = request.table.columns[foreignKeyAfter[0]];
                    /// initialize columnn in current record to store the array of foreign key results
                    data[column.name] = [];
                    for (const child of foreignKeyAfter[1]) {
                        /// define data columns with current record associated columns
                        const foreignKey = column.resolver;
                        foreignKey.columns.forEach((value, key) => {
                            child[value] = data[key];
                        });
                        /// call foreign key mutation passing args and data
                        const foreignKeyResult = yield ((_b = (_a = column) === null || _a === void 0 ? void 0 : _a.mutation) === null || _b === void 0 ? void 0 : _b.execute(Object.assign(Object.assign({}, request), { args: { data: child }, parent: request.args.data, resolver: column.mutation, table: column.mutation.table })));
                        /// add foreign key in array of column
                        data[column.name].push(foreignKeyResult[0]);
                    }
                }
            }
        });
    }
    processTableEvents(events, eventExecution) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!events) {
                return;
            }
            for (const event of events) {
                yield eventExecution(event);
            }
        });
    }
}
exports.Table = Table;
