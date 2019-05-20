import { EnvironmentDef, PieFile, RequestDef, Var, VarType } from "./ast";
import { LineTracker } from "./line-tracker";

export const ENV_VAR_NAME = "ENV";

interface IVarMap {
    [key: string]: string | number;
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
                    return; // done!
                }
            }
        }
    }

    private addVar(v: Var) {
        switch (v.type) {
        case VarType.Header:
            this.headers[v.name.toLowerCase()] = v.value;
            break;

        case VarType.Variable:
            this.vars[v.name] = v.value;
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
}
