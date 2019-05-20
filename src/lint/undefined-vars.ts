import { IInterval } from "../ast";
import { RequestContext } from "../context";
import { ILint } from "./model";

interface IReferencedVar {
    name: string;
    context: IInterval;
}

export function *detectUndefinedVars(
    context: RequestContext,
): Iterable<ILint> {
    for (const ref of referencedVars(context)) {
        const [ line ] = context.lines.lineRange(ref.context);
        const lineText = context.lines.get(line);
        const col = lineText.indexOf(ref.name);

        // FIXME it could be elsewhere within the lineRange

        if (!context.vars[ref.name]) {
            const lint = {
                // NOTE: column is 1-index, so the -1 to point to the
                // dollar char cancels out the +1 to match the column
                column: col === -1 ? 1 : col,
                line,
                message: `Reference to undefined var $${ref.name}`,
                type: "warn",
            } as ILint;

            if (col !== -1) {
                lint.endLine = lint.line;
                lint.endColumn = col + ref.name.length + 1;
            }

            yield lint;
        }
    }
}

function *referencedVars(context: RequestContext) {
    for (const value of Object.values(context.headers)) {
        if (typeof value.value !== "string") continue;

        yield *findVarsIn(value.interval, value.stringValue);
    }

    // TODO can we be more precise about the detected var location?
    yield *findVarsIn(context.request.interval, context.request.body || "");
    yield *findVarsIn(context.request.interval, context.request.path || "");
}

function *findVarsIn(context: IInterval, str: string): Iterable<IReferencedVar> {
    const regex = /\$([a-zA-Z0-9_-]+)/g;

    while (true) {
        const match = regex.exec(str);
        if (!match) return;

        yield {
            context,
            name: match[1],
        };
    }
}
