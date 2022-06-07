import { Collection, Filter, FindCursor, ObjectId, Sort, SortDirection, WithId } from "mongodb"

class MongoFilterConverter {
    public static convert(where: any): any {
        if (!where) return {}
        const array = Object.getOwnPropertyNames(where);

        if (!array || array.length === 0) return {};
        const fieldName = array[0];

        const result = OperationProvider.getOperation(fieldName, where[fieldName]);
        return result;
    }
}

interface Operation {
    convertOperation(fieldName: string, expression: any): any
}

/* tslint:disable:max-classes-per-file */
class OperationProvider {
    static getOperation(fieldName: string, where: any): any {
        const operations = new AndOperation(
            new OrOperation(
                new EqOperation(
                    new NeqOperation(
                        new ContainsOperation(
                            new NContainsOperation(
                                new InOperation(
                                    new NInOperation(
                                        new StartsWithOperation(
                                            new EndsWithOperation(
                                                new NStartsWithOperation(
                                                    new NEndsWithOperation(
                                                        new GtOperation(
                                                            new GteOperation(
                                                                new NGtOperation(
                                                                    new NGteOperation(
                                                                        new LtOperation(
                                                                            new LteOperation(
                                                                                new NLtOperation(
                                                                                    new NLteOperation(
                                                                                        new AllOperation(
                                                                                            new SomeOperation(
                                                                                                new NoneOperation(
                                                                                                    new AnyOpertation(
                                                                                                        new FieldOperation(
                                                                                                            undefined)))))))))))))))))))))))));
        return operations.convertOperation(fieldName, where);
    }
}

abstract class OperationHandler implements Operation {
    nextHandler?: OperationHandler;

    constructor(nextHandler?: OperationHandler) {
        this.nextHandler = nextHandler;
    }

    public next(fieldName: string, source: any): any {
        if (this.nextHandler) {
            return this.nextHandler.convertOperation(fieldName, source);
        }
    }
    public abstract convertOperation(fieldName: string, source: any): any;
}

abstract class BaseOperation extends OperationHandler {
    public convertOperation(fieldName: string, source: any) {
        const tagName = this.getTagName(source);
        if (!this.chargeOf(tagName))
            return this.next(fieldName, source);

        return this.generateOperation(fieldName, source, tagName);
    }

    protected generateOperation(fieldName: string, source: any, tagName?: string): any {
        const tmpString = `{"${fieldName}": {"${this.targetTag}": null}}`;
        const converted = JSON.parse(tmpString);
        converted[fieldName][this.targetTag] = this.getValue(fieldName, source, tagName);
        return converted;
    }

    protected notOperation(fieldName: string, source: any, tagName?: string): any {
        const tmpString = `{"${fieldName}": {"$not":{"${this.targetTag}": null}}}`;
        const converted = JSON.parse(tmpString);
        const keyOfNot = "$not";
        converted[fieldName][keyOfNot][this.targetTag] = this.getValue(fieldName, source, tagName);
    }

    protected getValue(fieldName: string, source: any, tagName?: string): any {
        const value = source[tagName + ''];
        if (fieldName === "_id") {
            try {
                return new ObjectId(value);
            } catch (err) {
                return value;
            }
        }
        return value;
    }

    protected chargeOf(tagName: string | undefined): boolean {
        if (!tagName) return false;
        if (tagName === this.sourceTag) return true;
        return false;
    }

    protected getTagName(source: any): string | undefined {
        if (!source) return undefined;

        const array = Object.getOwnPropertyNames(source);
        if (!array || array.length === 0) return undefined;

        const key = array[0];
        return key;
    }

    protected abstract sourceTag: string;
    protected abstract targetTag: string;
}

class EqOperation extends BaseOperation {
    protected sourceTag: string = "eq";
    protected targetTag: string = "$eq"
}

class NeqOperation extends BaseOperation {
    protected sourceTag: string = "neq";
    protected targetTag: string = "$ne"
}

class RegexOperation extends BaseOperation {
    protected sourceTag: string = "regex";
    protected targetTag: string = "$regex";

    generateOperation(fieldName: string, source: any, tagName?: string) {
        const convertedString = `{"${fieldName}": {"${this.targetTag}": "${this.getValue(fieldName, source, tagName)}", "$options": "i"}}`;
        const converted = JSON.parse(convertedString);
        return converted;
    }

    protected notOperation(fieldName: string, source: any, tagName?: string) {
        const convertedString = `{"${fieldName}": {"$not":{"${this.targetTag}": "${this.getValue(fieldName, source, tagName)}", "$options": "i"}}}`;
        const converted = JSON.parse(convertedString);
        return converted;
    }

    protected getValue(fieldName: string, source: any, tagName?: string) {
        return source[tagName + ''];
    }
}

class ContainsOperation extends RegexOperation {
    protected sourceTag: string = "contains";
}

class NContainsOperation extends ContainsOperation {
    protected sourceTag: string = "ncontains";

    generateOperation(fieldName: string, source: any, tagName?: string) {
        return this.notOperation(fieldName, source, tagName);
    }
}

class StartsWithOperation extends RegexOperation {
    protected sourceTag: string = "startsWith";

    protected getValue(fieldName: string, source: any, tagName?: string) {
        return '^' + super.getValue(fieldName, source, tagName);
    }
}

class NStartsWithOperation extends StartsWithOperation {
    protected sourceTag: string = "nstartsWith";

    generateOperation(fieldName: string, source: any, tagName?: string) {
        return this.notOperation(fieldName, source, tagName);
    }
}

class EndsWithOperation extends RegexOperation {
    protected sourceTag: string = "endsWith";

    protected getValue(fieldName: string, source: any, tagName?: string) {
        return super.getValue(fieldName, source, tagName) + '$';
    }
}

class NEndsWithOperation extends EndsWithOperation {
    protected sourceTag: string = "nendsWith";

    generateOperation(fieldName: string, source: any, tagName?: string) {
        return this.notOperation(fieldName, source, tagName);
    }
}

class InOperation extends BaseOperation {
    protected sourceTag: string = "in";
    protected targetTag: string = "$in";

    getValue(fieldName: string, source: any, tagName?: string) {
        const values = source[tagName + ''] as [];
        if (fieldName === "_id") {
            return values.map(v => {
                try {
                    return new ObjectId(v);
                } catch (err) {
                    return v;
                }
            });
        }
        return values;
    }
}

class NInOperation extends InOperation {
    protected sourceTag: string = "nin";
    protected targetTag: string = "$nin";
}

// Greater then
class GtOperation extends BaseOperation {
    protected sourceTag: string = "gt";
    protected targetTag: string = "$gt";
}

// not greater then equals
class NLteOperation extends GtOperation {
    protected sourceTag: string = "nlte";
}

// Greater then equals
class GteOperation extends BaseOperation {
    protected sourceTag: string = "gte";
    protected targetTag: string = "$gte";
}

// not less then
class NLtOperation extends GteOperation {
    protected sourceTag: string = "nlt";
}

// Less then
class LtOperation extends BaseOperation {
    protected sourceTag: string = "lt";
    protected targetTag: string = "$lt";
}

// not greater then equals
class NGteOperation extends LtOperation {
    protected sourceTag: string = "ngte";
}

// Less then equals
class LteOperation extends BaseOperation {
    protected sourceTag: string = "lte";
    protected targetTag: string = "$lte";
}

// not greater then
class NGtOperation extends LteOperation {
    protected sourceTag: string = "ngt";
}

class AllOperation extends BaseOperation {
    protected sourceTag: string = "all";
    protected targetTag: string = "$all";

    getValue(fieldName: string, source: any, tagName?: string) {
        const values = source[tagName + ''] as [];
        if (fieldName === "_id") {
            return values.map(v => {
                try {
                    return new ObjectId(v);
                } catch (err) {
                    return v;
                }
            });
        }
        return values;
    }
}

class SomeOperation extends InOperation {
    protected sourceTag: string = "some";
}

class NoneOperation extends NInOperation {
    protected sourceTag: string = "none";
}

class AnyOpertation extends BaseOperation {
    protected sourceTag: string = "any";
    protected targetTag: string = "$where";

    protected generateOperation(fieldName: string, source: any, tagName?: string): any {
        const hasAny = source.any as boolean;
        let whereString = "";
        if (hasAny) {
            whereString = `this.${fieldName} != null && this.${fieldName}.length > 0`;
        } else {
            whereString = `this.${fieldName} == null || this.${fieldName}.length == 0`;
        }
        const result = { $where: whereString };
        return result;
    }
}

class AndOperation extends OperationHandler {
    public convertOperation(fieldName: string, source: any) {
        if (fieldName !== this.sourceTag)
            return this.next(fieldName, source);

        return this.generateOperation(fieldName, source, fieldName);
    }

    protected sourceTag: string = "and";
    protected targetTag: string = "$and";

    generateOperation(fieldName: string, source: any, tagName?: string) {
        const expressions = source as [];

        const converted = expressions.map(exp => {
            const array = Object.getOwnPropertyNames(exp);
            if (!array || array.length === 0) return {};
            const expFieldName = array[0];
            const where = exp[expFieldName];
            return OperationProvider.getOperation(expFieldName, where);
        });
        const andObj: any = {};
        andObj[this.targetTag] = converted;
        return andObj;
    }
}

class OrOperation extends AndOperation {
    protected sourceTag: string = "or";
    protected targetTag: string = "$or";
}

class FieldOperation extends OperationHandler {
    public convertOperation(fieldName: string, source: any) {
        let operations = OperationProvider.getOperation(fieldName, source);
        if (!operations)
            operations = {};
        return operations;
    }
}

/**
 * --------------------------------------------------------
 * 以下為處理排序用
 * --------------------------------------------------------
 */

class MongoOrderConverter {
    public static convert(orders?: any[]): Sort {
        if (!orders || orders.length === 0) return {};

        const map = new Map<string, SortDirection>();
        orders.forEach(order => {
            const array = Object.getOwnPropertyNames(order);
            if (!array || array.length === 0) return {};
            const fieldName = array[0];
            const Ascending = order[fieldName];

            let asc: SortDirection = 1;
            if (Ascending === "DESC")
                asc = -1;
            map.set(fieldName, asc);
        });

        const sort = map as Sort;
        return sort;
    }
}

/**
 * --------------------------------------------------------
 * 以下為處理分頁用
 * --------------------------------------------------------
 */

type PageInfo = {
    hasNextPage: boolean,
    hasPreviousPage: boolean
    startCursor: string
    endCursor: string
}

type Pagination = {
    first: number,
    after: string,
    last: number,
    before: string
}

class Edge<T> {
    constructor(public cursor: string, public node: T) { }
}

class Connection<T> {
    constructor(public pageInfo: PageInfo, public edges: Edge<T>[]) {
        edges = new Array<Edge<T>>();
    }
}

class ConnectionGenerator<T> {
    constructor(private collection: Collection<T>, private filter: Filter<T>, private sort: Sort) {

    }

    public async generate(pagination?: Pagination): Promise<Connection<T>> {
        const totalCount = await this.collection.countDocuments(this.filter);
        const cursor = this.collection.find(this.filter).sort(this.sort);

        let currentCursor = cursor;
        let hasNextPage: boolean = false;
        let hasPreviousPage: boolean = false;
        let startIndex: number = 0;
        let endIndex: number = 0;
        if (!pagination) {
            endIndex = totalCount;
        }
        else if (pagination.first) {
            const after = this.base64ToNumber(pagination.after);
            startIndex = pagination.after ? after + 1 : 0;
            endIndex = startIndex + pagination.first;

            currentCursor = cursor.skip(startIndex).limit(pagination.first);

            if (endIndex < totalCount) {
                hasNextPage = true;
                endIndex = totalCount;
            }
            if (after > 0)
                hasPreviousPage = true;
        }
        else if (pagination.last) { // 找上一頁
            const before = pagination.before ? this.base64ToNumber(pagination.before) : totalCount;
            startIndex = before - pagination.last;
            endIndex = before;
            let limit = pagination.last;
            if (startIndex < 0) {
                limit = endIndex;
                startIndex = 0;
            }

            currentCursor = cursor.skip(startIndex).limit(limit);

            if (endIndex < totalCount)
                hasNextPage = true;
            if (startIndex > 0)
                hasPreviousPage = true;
        }

        const edges = new Array<Edge<T>>();
        let index: number = startIndex;
        let startCursor: string = '';
        let endCursor: string = '';

        for await (const data of currentCursor) {
            const node = data as T;
            const cursorString = this.numberToBase64(index);
            const edge = new Edge<T>(cursorString, node);
            edges.push(edge);

            if (!startCursor)
                startCursor = cursorString;
            endCursor = cursorString;

            index++;
        }

        const pageInfo: PageInfo = {
            hasNextPage,
            hasPreviousPage,
            startCursor,
            endCursor,
        };
        const connection = new Connection<T>(pageInfo, edges);
        return connection;
    }

    private base64ToNumber(base64: string): number {
        if (!base64) return 0;
        const str = Buffer.from(base64, 'base64').toString('binary');
        const num: number = +str;
        return num;
    }

    private numberToBase64(num?: number): string {
        const str: string = num + '';
        return Buffer.from(str, 'binary').toString('base64');
    }
}

async function queryConnection<T>(args: any, collection?: Collection<T>): Promise<Connection<T>> {
    let filter: any = {};
    let order: Sort = {};
    let pagination: any;
    if (args) {
        filter = MongoFilterConverter.convert(args.where);

        const orderInputs = args.order as any[];
        order = MongoOrderConverter.convert(orderInputs);
        pagination = {
            first: args.first,
            last: args.last,
            before: args.before,
            after: args.after,
        };
    }
    const generator = new ConnectionGenerator(collection!, filter, order);
    return generator.generate(pagination as Pagination);
}


export {
    MongoFilterConverter,
    MongoOrderConverter,
    ConnectionGenerator,
    PageInfo,
    Edge,
    Connection,
    Pagination,
    queryConnection,
}


