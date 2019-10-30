import {
    EnvironmentDef,
    PieFile,
    ProcessorDef,
    RequestDef,
    Var,
    VarType,
} from "./ast";
import { LineTracker } from "./line-tracker";

export const ENV_VAR_NAME = "ENV";

interface IVarMap {
    [key: string]: Var;
}

export class RequestContext {
    public static create(
        file: PieFile,
        requestLine: number,
    ) {
        const context = new RequestContext(new LineTracker(file.source));
        context.build(file, requestLine);
        return context;
    }

    public readonly vars: IVarMap = {};
    public readonly headers: IVarMap = {};

    private requestDef: RequestDef | undefined;
    private processorDef: ProcessorDef | undefined;

    private constructor(
        public readonly lines: LineTracker,
    ) {
        // private!
    }

    public get hasRequest(): boolean {
        return this.requestDef !== undefined;
    }

    public get request(): RequestDef {
        const req = this.requestDef;
        if (!req) throw new Error("No request found");
        return req;
    }

    public get processor(): ProcessorDef | undefined {
        return this.processorDef;
    }

    private build(file: PieFile, requestLine: number) {
        const envVar = this.findTopLevelVar(
            file,
            VarType.Variable,
            ENV_VAR_NAME,
        );
        const environments: Set<string> = envVar
            ? new Set((envVar.value.toString()).split(","))
            : new Set();

        const lines = new LineTracker(file.source);

        for (const item of file.entries) {
            if (item instanceof Var) {
                this.addVar(item);
            } else if (item instanceof EnvironmentDef) {
                if (!environments.has(item.id)) continue;

                for (const child of item.vars) {
                    this.addVar(child);
                }
            } else if (item instanceof RequestDef) {
                const [ start, end ] = lines.lineRange(item.interval);
                if (requestLine >= start && requestLine <= end) {
                    this.requestDef = item;

                    // request-specific headers
                    for (const v of item.headers) {
                        this.addVar(v);
                    }
                    break; // done!
                }
            }
        }

        const def = this.requestDef;
        if (!def) return;

        if (def.processorName) {
            const processor = this.findProcessor(file, def.processorName);
            if (!processor) {
                throw new Error(
                    `Request uses non-existant Processor ${def.processorName}`,
                );
            }

            this.processorDef = processor;
        }
    }

    private addVar(v: Var) {
        switch (v.type) {
        case VarType.Header:
            this.headers[v.name.toLowerCase()] = v;
            break;

        case VarType.Variable:
            this.vars[v.name] = v;
            break;
        }
    }

    private findTopLevelVar(
        file: PieFile,
        type: VarType,
        name: string,
    ) {
        for (const item of file.entries) {
            if (!(item instanceof Var) || item.type !== type) {
                continue;
            }

            if (item.name === name) return item;
        }
    }

    private findProcessor(
        file: PieFile,
        name: string,
    ) {
        for (const item of file.entries) {
            if (item instanceof ProcessorDef && item.name === name) {
                return item;
            }
        }
    }
}
