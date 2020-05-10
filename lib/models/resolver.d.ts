import { ResolverRequest } from "./resolver-request";
import { Table } from "./table";
export declare type ResolverFunction = (request: ResolverRequest) => any;
export declare type ResolverBeforeEvent = (request: ResolverRequest) => void;
export declare type ResolverAfterEvent = (request: ResolverRequest, data: any) => void;
export declare class Resolver {
    table: Table;
    name: string;
    type: string;
    args: IResolverArg[];
    returnType: string;
    returnMany: boolean;
    resolver: ResolverFunction;
    before: ResolverBeforeEvent[];
    after: ResolverAfterEvent[];
    constructor(table: Table, name: string, type: string, args: IResolverArg[], returnType: string, returnMany: boolean, resolver: ResolverFunction);
    getArgsDefs(): string;
    execute(request: ResolverRequest): Promise<any>;
}
export interface IResolverArg {
    name: string;
    type: string;
    required: boolean;
}
