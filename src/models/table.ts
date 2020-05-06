import * as Knex from "knex";
import { jsonWhere } from 'knex-json-where';

import { GraphQLSchema, reduceArray } from "..";
import { Column } from "./column";
import { ForeignKey } from "./foreign-key";
import { Resolver } from "./resolver";
import { ResolverRequest } from "./resolver-request";
import { UniqueKey } from "./unique-key";

export type EventExecution<E> = (event: E) => void;
export type EventFunction<S,R> = (sender: S) => R;
export type EventArgFunction<S,A,R> = (sender: S, arg: A) => R;

export class Table {
    public schema: GraphQLSchema;
    
    public tableSchema: string;
    public tableName: string;
    public typeName: string;
    
    public selectFields: any[] = ['*'];
    public defaultQuery: Knex.QueryBuilder;
  
    public columns: any = {};
    public primaryKeys: Column[] = [];
    public uniqueKeys: UniqueKey[] = [];
    public ordination: string[] = [];
  
    public queries: any = {};
    public mutations: any = {};
  
    public beforeInsert: Array<EventFunction<ResolverRequest, void>> = [];
    public afterInsert: Array<EventArgFunction<ResolverRequest, any, void>> = [];
    public beforeUpdate: Array<EventArgFunction<ResolverRequest, any, void>> = [];
    public afterUpdate: Array<EventArgFunction<ResolverRequest, any, void>> = [];
    public beforeDelete: Array<EventArgFunction<ResolverRequest, any, void>> = [];
    public afterDelete: Array<EventArgFunction<ResolverRequest, any, void>> = [];
  
    constructor(schema: GraphQLSchema, tableSchema: string, tableName: string, typeName: string, tableColumns: any[], uniqueKeys: any[]) {
        this.schema = schema;
        this.tableSchema = tableSchema;
        this.tableName = tableName;
        this.typeName = typeName;
    
        tableColumns.forEach((tableColumn) => {
            const column = new Column(this, tableColumn.column_name, tableColumn.column_type, tableColumn.primary_key);
            this.columns[column.name] = column;
            if (column.primaryKey) {
            this.primaryKeys.push(column);
            this.ordination.push(column.name);
            }
        });
    
        if (uniqueKeys) {
            uniqueKeys.forEach((item: any) => {
            this.uniqueKeys.push(new UniqueKey(this, item.constraint_name, item.columns));
            });
        }
    
        this.defaultQuery = schema.database
            .withSchema(this.tableSchema)
            .table(this.tableName)
            .select(this.selectFields);
    }
  
    public getColumnsTypeDefs(forInputType: boolean): string {
        return reduceArray(Object.keys(this.columns), '\n', (columnName: string) => {
            const column: Column = this.columns[columnName];
            if (!column || (forInputType && !column.allowInput)) {
            return '';
            }
            return `\t${column.getTypeDef(forInputType)}`;
        });
    }
    public getResolversTypeDefs(resolvers: any): string {
        return reduceArray(Object.keys(resolvers), '\n', (queryName: string) => {
            const resolver: Resolver = resolvers[queryName];
            if (!resolver) {
            return '';
            }
            return `\t${queryName}${resolver.getArgsDefs()}: ${resolver.returnType}`;
        });
    }
  
    public createDefaultQuery(db: Knex, trx?: Knex.Transaction, where?: any): Knex.QueryBuilder {
        let query = this.defaultQuery.clone();
        
        if (where) {
            query = query.where(jsonWhere(where));
        } 
    
        if (trx) {
            query = query.transacting(trx);
        }
    
        this.ordination.forEach(columnName => {
            query = query.orderBy(columnName);
        });
    
        return query;
    }
  
    public createWhereJson(values: any, columns?: Column[]) {
        if (!columns) {
            columns = this.primaryKeys;
        }
    
        let where: any = null;
        columns.forEach((column: Column) => {
            if (values[column.name]) {
    
            if (!where) {
                where = {};
            }
    
            where[column.name] = {
                _eq: values[column.name]
            };
    
            } else {
    
            if (where) {
                throw new Error('You must enter all primary or unique keys');
            }
    
            }
        });
        return where;
    }
  
    public async processMutation(schema: GraphQLSchema, request: ResolverRequest, where: any): Promise<any> {
        const foreingKeysAfter: Map<string, any> = await request.table.processForeignKeyMutation(request);
    
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
  
      let currentRecord = (where ? await request.table.createDefaultQuery(request.database, request.trx, where) : null);
      if (currentRecord && currentRecord.length > 0) {
        
        await this.processTableEvents<EventArgFunction<ResolverRequest, any, void>>(request.table.beforeUpdate, (event) => event(request, currentRecord[0]));
        currentRecord = await request.table.createDefaultUpdate(request.database, request.trx as Knex.Transaction, where, request.args.data);
        await this.processTableEvents<EventArgFunction<ResolverRequest, any, void>>(request.table.afterUpdate, (event) => event(request, (currentRecord.length > 0 ? currentRecord[0] : null)));
      
      } else {
        
        await this.processTableEvents<EventFunction<ResolverRequest, void>>(request.table.beforeInsert, (event) => event(request));
        currentRecord = await request.table.createDefaultInsert(request.database, request.trx as Knex.Transaction, request.args.data);
        
        if (currentRecord && currentRecord.length > 0) {
          await this.processTableEvents<EventArgFunction<ResolverRequest, any, void>>(request.table.afterInsert, (event) => event(request, currentRecord[0]));
        }
  
      }
  
      // if no result throw error
      if (!currentRecord || currentRecord.length === 0) {
        throw new Error('No records returned in mutation ' + request.resolver.name);
      }
  
      await request.table.processChildsForeignKeyMutation(request, currentRecord[0], foreingKeysAfter);
  
      return currentRecord;
    }
    public async processDelete(schema: GraphQLSchema, request: ResolverRequest) {
      await schema.applyInterceptor<ResolverRequest>(schema?.options?.interceptors?.mutations, [request.resolver.name, 'delete', 'mutation', 'default'], request);
  
      const where: any = request.table.createWhereJson(request.args.data);
      const currentRecord = (where ? await request.table.createDefaultQuery(request.database, request.trx, where) : null);
  
      if (currentRecord && currentRecord.length > 0) {
        await this.processTableEvents<EventArgFunction<ResolverRequest, any, void>>(request.table.beforeDelete, (event) => event(request, currentRecord[0]));
        const deletedRecord: any = request.database
              .withSchema(request.table.tableSchema)
              .table(request.table.tableName)
              .transacting(request.trx as Knex.Transaction)
              .where(jsonWhere(where))
              .delete()
              .returning(request.table.selectFields);
  
        // if no result throw error
        if (!deletedRecord || deletedRecord.length === 0) {
          throw new Error('No record deleted in mutation ' + request.resolver.name);
        }
  
        await this.processTableEvents<EventArgFunction<ResolverRequest, any, void>>(request.table.afterDelete, (event) => event(request, currentRecord[0]));
      }
  
      return currentRecord;
    }
  
    private createDefaultInsert(db: Knex, trx: Knex.Transaction, data: any) {
        return db
            .withSchema(this.tableSchema)
            .table(this.tableName)
            .transacting(trx)
            .returning(this.selectFields)
            .insert(data);
    }
    private createDefaultUpdate(db: Knex, trx: Knex.Transaction, where: any, data: any) {
        let update = db
            .withSchema(this.tableSchema)
            .table(this.tableName)
            .transacting(trx)
            .update(data)
            .returning(this.selectFields);
        
        if (where) {
            update = update.where(jsonWhere(where));
        }
    
        return update;
    }

    private async processForeignKeyMutation(request: ResolverRequest): Promise<Map<string, any>> {
  
      /// Map to store all foreign keys to be executed after inserting / updating current record
      const foreingKeysAfter: Map<string, any> = new Map();
          
      /// go through all fields and check if have any foreign key fields so you can insert the record before the main record.
      for (const columnName of Object.keys(request.args.data)) {
  
        const column: Column = request.table.columns[columnName];
  
        if (column && column.resolver && column.resolver instanceof ForeignKey) {
          const foreignKey: ForeignKey = (column.resolver as ForeignKey);
  
          if (!foreignKey.returnMany) {
  
            /// call foreign key mutation passing args and parent data
            const foreignKeyResult = await column?.mutation?.execute({
              ...request,
              args: { data: request.args.data[columnName] },
              parent: request.args.data,
              resolver: column.mutation,
              table: column.mutation.table
            });
  
            /// Seta os valores do registro inserido/atualizado da chave estrangeira no dado atual
            const foreignKey: ForeignKey = (column.resolver as ForeignKey);
            foreignKey.columns.forEach((value: string, key: string) => {
              request.args.data[key] = foreignKeyResult[0][value];
            });
  
          } else {
  
            /// store foreign key will need to execute after mutate current record
            foreingKeysAfter.set(columnName, request.args.data[columnName]);
  
          }
  
          /// Removes foreign key column to leave only columns to be inserted into database
          delete(request.args.data[columnName]);  
        }
      }
  
      return foreingKeysAfter;
    }
    private async processChildsForeignKeyMutation(request: ResolverRequest, data: any, foreingKeysAfter: Map<string, any>) {
      if (foreingKeysAfter.size > 0) {
  
        /// go through all fields and check if have any foreign key fields so you can insert the 
        /// record before the main record.
        for (const foreignKeyAfter of foreingKeysAfter) {
    
          /// get column of foreign key
          const column: Column = request.table.columns[foreignKeyAfter[0]];
  
          /// initialize columnn in current record to store the array of foreign key results
          data[column.name] = [];
          
          for (const child of foreignKeyAfter[1]) {
  
            /// define data columns with current record associated columns
            const foreignKey: ForeignKey = (column.resolver as ForeignKey);
            foreignKey.columns.forEach((value: string, key: string) => {
              child[value] = data[key];
            });
  
            /// call foreign key mutation passing args and data
            const foreignKeyResult = await column?.mutation?.execute({
              ...request,
              args: { data: child },
              parent: request.args.data,
              resolver: column.mutation,
              table: column.mutation.table
            });
  
            /// add foreign key in array of column
            data[column.name].push(foreignKeyResult[0]);
          }
  
        }
      }
    }
    private async processTableEvents<E>(events: any[], eventExecution: EventExecution<E>) {
        if (!events) {
            return;
        }
        for (const event of events) {
            await eventExecution(event);
        }
    }
}