import { Resolver } from "./resolver";
import { Table } from "./table";

export class Column {
    public table: Table;
    public name: string;
    public originalType: string;
    public graphQLType: string;
    public primaryKey: boolean;
    public resolver?: Resolver;
    public mutation?: Resolver;
    public allowInput: boolean;
  
    constructor(table: Table, name: string, originalType?: string, options?: IColumnOptions) {
        this.table = table;
        this.name = name;
        this.originalType = originalType ?? '';
        this.graphQLType = options?.graphQLType ?? '';
        if (originalType && !this.graphQLType) {
            this.graphQLType = this.defineGraphQLType();
        }
        this.primaryKey = (options?.primaryKey ?? false);
        if (this.primaryKey) {
            this.graphQLType = "ID";
        }
        this.allowInput = (options?.allowInput ?? true);
    }
  
    public getTypeDef(forInputType: boolean): string {
        return `${this.name}: ${this.getGraphQLTypeDef(forInputType)}`;
    }
  
    public getGraphQLTypeDef(forInputType: boolean): string {
        if (forInputType) {
            const returnArray: boolean = this.graphQLType.startsWith('[');
            const typeDef = (forInputType && this.resolver ? 'Input' : '') + (returnArray ? this.graphQLType.substring(1, this.graphQLType.length - 1) : this.graphQLType);
            return (returnArray ? `[${typeDef}]` : typeDef); 
        }
        return this.graphQLType;
    }
  
    private defineGraphQLType() {
        let type: string = '';
    
        /// It will first be checked if the client has entered in the GraphQLSchema startup
        /// options the array of custom types.
        if (this.table.schema.options && this.table.schema.options.customTypes) {
            type = (this.table.schema.options.customTypes as any)[this.originalType] as string;
        }
  
        /// If does not have custom types for the original type, a default type setting will
        /// be used.
        if (!type) {
            type = ({
            'bigint': 'Int',
            'boolean': 'Boolean',
            'char': 'String',
            'character': 'String',
            'character varying': 'String',
            'citext': 'String',
            'date': 'Date',
            'float8': 'Float',
            'int4': 'Int',
            'int8': 'Int',
            'integer': 'Int',
            'json': 'JSON',
            'number': 'Float',
            'numeric': 'Float',
            'smallint': 'Int',
            'text': 'String',
            'time': 'String',
            'timestamp': 'Date',
            'timestamptz': 'Date',
            'uuid': 'String',
            'varchar': 'String'
            } as any)[this.originalType];
        }
    
        /// And if the original type still doesn't have a type option for GraphQL set, an
        /// error will be thrown
        if (!type) {
            throw new Error(`Could not get GraphQL type to use for columns of type '${this.originalType}'`);
        }
  
        return type;
    }
}

export interface IColumnOptions {
    primaryKey?: boolean;
    graphQLType?: string;
    allowInput?: boolean;
}