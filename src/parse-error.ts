import { Interval, MatchResult } from "ohm-js";

export class ParseError extends Error {

    public readonly line: number;
    public readonly column: number;

    public readonly shortMessage?: string;

    constructor(match: MatchResult | string) {
        super(typeof match === "string" ? match : match.message);

        if (typeof match === "string") {
            // TODO ?
            this.line = 0;
            this.column = 0;
        } else {
            // this is gross:
            const interval: Interval = (match as any).getInterval();
            const msg = interval.getLineAndColumnMessage();
            const m = msg.match(/ (\d+), col (\d+)/);
            if (!m) throw new Error("Unexpected line and column message");

            this.line = parseInt(m[1], 10);
            this.column = parseInt(m[2], 10);
            this.shortMessage = match.shortMessage;
        }
    }
}
