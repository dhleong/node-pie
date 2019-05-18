import { EnvironmentDef, IInterval, PieFile, RequestDef, Var, VarType } from "./ast";

export const ENV_VAR_NAME = "ENV";

interface IVarMap {
    [key: string]: string | number;
}

class LineTracker {

    private lastLine: number = 0;
    private lastOffset: number = 0;

    constructor(
        private source: string,
    ) {}

    public lineRange(interval: IInterval): [number, number] {
        this.advanceUntil(interval.start);
        const lineStart = this.lastLine;

        this.advanceUntil(interval.end);
        const lineEnd = this.lastLine;

        return [lineStart, lineEnd];
    }

    private advanceUntil(targetOffset: number) {
        for (; this.lastOffset < targetOffset; ++this.lastOffset) {
            const ch = this.source[this.lastOffset];
            if (ch === "\n" || ch === "\r") {
                ++this.lastLine;
            }
        }
    }
}

export class RequestContext {
    public static create(
        file: PieFile,
        requestLine: number,
    ) {
        const context = new RequestContext();
        context.build(file, requestLine);
        return context;
    }

    public readonly vars: IVarMap = {};
    public readonly headers: IVarMap = {};

    private requestDef: RequestDef | undefined;

    private constructor() {
        // private!
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

                    // TODO request-specific vars, headers
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
