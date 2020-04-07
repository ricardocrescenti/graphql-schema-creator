import { reduceArray } from "..";
import { ResolverRequest } from "./resolver-request";
import { Table } from "./table";

export type ResolverFunction = (request: ResolverRequest) => any;
export type ResolverBeforeEvent = (request: ResolverRequest) => void;
export type ResolverAfterEvent = (request: ResolverRequest, data: any) => void;

export class Resolver {
    public table: Table;
    public name: string;
    public type: string;
    public args: IResolverArg[];
    public returnType: string;
    public returnMany: boolean;
    public resolver: ResolverFunction;
  
    public before: ResolverBeforeEvent[] = [];
    public after: ResolverAfterEvent[] = [];
  
    constructor(table: Table, name: string, type: string, args: IResolverArg[], returnType: string, returnMany: boolean, resolver: ResolverFunction) {
      this.table = table;
      this.name = name;
      this.type = type;
      this.args = args;
      this.returnType = (returnMany ? `[${returnType}]` : returnType);
      this.returnMany = returnMany;
      this.resolver = resolver;
    }
  
    public getArgsDefs(): string {
      if (this.args && this.args.length > 0) {
        return '(' + reduceArray(this.args, ', ', (arg: IResolverArg) => {
          return `${arg.name}: ${arg.type}${arg.required ? '!' : ''}`;
        }) + ')';
      }
      return '';
    }
  
    public execute(request: ResolverRequest): any {
      this.before.forEach((event) => {
        event(request);
      });
  
      const result: any = this.resolver(request);
      
      this.after.forEach((event) => {
        event(request, result);
      });
  
      return result;
    }
}

export interface IResolverArg {
    name: string;
    type: string;
    required: boolean;
}