"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Column {
    constructor(table, name, originalType, options) {
        var _a, _b, _c, _d, _e, _f;
        this.table = table;
        this.name = name;
        this.originalType = (originalType !== null && originalType !== void 0 ? originalType : '');
        this.graphQLType = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.graphQLType, (_b !== null && _b !== void 0 ? _b : ''));
        if (originalType && !this.graphQLType) {
            this.graphQLType = this.defineGraphQLType();
        }
        this.primaryKey = (_d = (_c = options) === null || _c === void 0 ? void 0 : _c.primaryKey, (_d !== null && _d !== void 0 ? _d : false));
        if (this.primaryKey) {
            this.graphQLType = "ID";
        }
        this.allowInput = (_f = (_e = options) === null || _e === void 0 ? void 0 : _e.allowInput, (_f !== null && _f !== void 0 ? _f : true));
    }
    getTypeDef(forInputType) {
        return `${this.name}: ${this.getGraphQLTypeDef(forInputType)}`;
    }
    getGraphQLTypeDef(forInputType) {
        if (forInputType) {
            const returnArray = this.graphQLType.startsWith('[');
            const typeDef = (forInputType && this.resolver ? 'Input' : '') + (returnArray ? this.graphQLType.substring(1, this.graphQLType.length - 1) : this.graphQLType);
            return (returnArray ? `[${typeDef}]` : typeDef);
        }
        return this.graphQLType;
    }
    defineGraphQLType() {
        let type = '';
        /// It will first be checked if the client has entered in the GraphQLSchema startup
        /// options the array of custom types.
        if (this.table.schema.options && this.table.schema.options.customTypes) {
            type = this.table.schema.options.customTypes[this.originalType];
        }
        /// If does not have custom types for the original type, a default type setting will
        /// be used.
        if (!type) {
            type = {
                'bigint': 'Int',
                'bool': 'Boolean',
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
            }[this.originalType];
        }
        /// And if the original type still doesn't have a type option for GraphQL set, an
        /// error will be thrown
        if (!type) {
            throw new Error(`Could not get GraphQL type to use for columns of type '${this.originalType}'`);
        }
        return type;
    }
}
exports.Column = Column;
