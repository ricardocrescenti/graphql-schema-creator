import { GraphQLSchema } from "..";
import { Column } from "./column";
import { Resolver, ResolverFunction } from "./resolver";
import { ResolverRequest } from "./resolver-request";
import { Table } from "./table";

export class ForeignKey extends Resolver {
    public column: Column;
    public referencedTable: Table;
    public columns: Map<string, string>;
  
    constructor(schema: GraphQLSchema, table: Table, column: Column, referencedTable: Table, columns: Map<string, string>, hasMany: boolean) {
        let returnType = referencedTable.typeName;
        if (hasMany) {
            returnType = `[${returnType}]`;
        }
    
        const resolver: ResolverFunction = async (request: ResolverRequest) => {
    
            /// if the column is already entered in the parent column, do not query again, and
            /// return de value informed in column
            if (request.parent[column.name]) {
            return request.parent[column.name];
            }
    
            /// But if the column is not entered in the parent, a database query will be made
            /// to query the relationship.
            let query = referencedTable.createDefaultQuery(schema.database);
    
            /// Add the conditions to make the relationship between the tables.
            columns.forEach((key, value) => {
            query = query.where(key, request.parent[value]);
            });
    
            /// Get and return query result, if not many, return first value or null, 
            /// otherwise return an array
            const result = await query;
            return (hasMany ? result : (result.length > 0 ? result[0] : null));
        };
    
        super(table, column.name, 'foreign_key', [], returnType, hasMany, resolver);
        this.column = column;
        this.referencedTable = referencedTable;
        this.columns = columns;
    }
  }