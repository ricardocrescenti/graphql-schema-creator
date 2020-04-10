import * as Knex from "knex";
import { Column } from './models/column';
import { ForeignKey } from './models/foreign-key';
import { Resolver } from './models/resolver';
import { ResolverRequest } from './models/resolver-request';
import { Table } from './models/table';
import { UniqueKey } from './models/unique-key';
export declare type ContextFunction = (context: any) => any;
export declare type FormatErrorFunction = (error: any) => any;
export declare class GraphQLSchema {
    /**
     * Initialize GraphQLSchemaCreator
     * @param database Knex reference to perform database queries and mutations
     * @param options Initialization options with filters, auth and interceptors
     */
    static initialize(database: Knex, options?: ICreationSchemaOptions): Promise<GraphQLSchema>;
    /**
     * Knex reference
     */
    database: Knex;
    /**
     * create options schema
     */
    options: ICreationSchemaOptions;
    /**
     * Map of loaded tables from database
     */
    tables: Map<string, Table>;
    /**
     * To initialize a GraphQLSchemaCreator, use `initialize()` static method
     * @database Knex reference to perform database queries and mutations
     */
    private constructor();
    /**
     * Apply interceptors in creating tables, queries, and mutations, allowing the programmer to modify the default structure.
     * @param location Interceptor location in initialize options object
     * @param interceptorsName Name of initializers to be tested, only the first to be found will be used
     * @param object Object to be intercepted, which can be `Table` or `Resolver`
     * @param interceptors
     */
    applyInterceptor<T>(location: any, interceptorsName: string[], object: T | null): Promise<T | null>;
    /**
     * Create the `ExecutableSchema` from` GraphQL`
     * @param options Options for creating ExecutableSchema allowing to modify `context` and format error returns using `formatError`
     */
    createExecutableSchema(options?: IExecutableSchemaOptions): {
        context: (context: any) => any;
        formatError: FormatErrorFunction;
        resolvers: any;
        typeDefs: import("graphql").DocumentNode;
    };
    /**
     * Query the tables and fields with primary key information in the database
     * @param filters Filters to apply when querying tables and fields
     */
    private getDatabaseSchema;
    /**
     * Generate and get types definitions of table ,queries, and mutations
     */
    private getTypesDefs;
    /**
     * Generate and get query and mutation resolvers
     */
    private getResolvers;
    /**
     * Method used by `_getResolvers` to get the final method of a specific resolver by applying permission checking
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` that will be prepared and returned
     */
    private getResolver;
    /**
     * Get permission validation associated with `Resolve`
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` which will be used to query the authentication setting and return the permission validation function
     */
    private getPermissionValidation;
    /**
     * Query the permission validation method of a `Resolver` query
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` which will be used to query the authentication setting and return the permission validation function
     * @param auth Auth object reference found in schema initialization options
     */
    private getQueryPermission;
    /**
     * Query the permission validation method of a `Resolver` mutation
     * @param table `Table` that the `Resolver` is associated with
     * @param resolver `Resolver` which will be used to query the authentication setting and return the permission validation function
     * @param auth Auth object reference found in schema initialization options
     */
    private getMutationPermission;
}
export interface ICreationSchemaOptions {
    filters?: ICreationSchemaFilters;
    customTypes?: object;
    auth?: object;
    interceptors?: ICreationSchemaInterceptors;
}
export interface ICreationSchemaFilters {
    ignoreTables?: string[];
    ignoreColumns?: string[];
    schemas?: string[];
    tables?: string[];
    tableCustomFilters?: string;
    columnCustomFilters?: string;
}
export interface ICreationSchemaInterceptors {
    tables?: object;
    queries?: object;
    mutations?: object;
}
export interface IExecutableSchemaOptions {
    context?: ContextFunction;
    formatError?: FormatErrorFunction;
}
export declare function normalizeName(name: string): string;
export declare function reduceArray<T>(array: T[], separator: string, convert: (item: any) => string): string;
export { Column, ForeignKey, ResolverRequest, Resolver, Table, UniqueKey };
