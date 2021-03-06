import { IInterval } from "./ast";

export class LineTracker {

    private lastLine: number = 1;
    private lastOffset: number = 0;

    private ranges: IInterval[] = [];

    constructor(
        private source: string,
    ) {}

    /**
     * @param lineNr in [1, END], as the results of `lineRange`
     */
    public get(lineNr: number): string {
        const index = lineNr - 1;
        if (index === this.ranges.length) {
            const start = this.ranges[this.ranges.length - 1].end + 1;
            const end = this.source.indexOf("\n", start + 1);
            return this.source.substring(start, end === -1 ? undefined : end);
        } else if (index > this.ranges.length) {
            this.advanceUntil(this.source.length - 1);
        }

        const interval = this.ranges[index];
        return this.source.substring(interval.start, interval.end);
    }

    public lineRange(interval: IInterval): [number, number] {
        if (interval.start < this.lastOffset) {
            return this.findOldRange(interval);
        }

        this.advanceUntil(interval.start);
        const lineStart = this.lastLine;

        this.advanceUntil(interval.end);
        const lineEnd = this.lastLine;

        return [lineStart, lineEnd];
    }

    private findOldRange(interval: IInterval): [number, number] {
        // this could be optimized with a binary search:
        let start = -1;
        let end = -1;

        for (let i = 0; i < this.ranges.length; ++i) {
            if (start === -1 && inInterval(this.ranges[i], interval.start)) {
                start = i + 1;

                if (end !== -1) break;
            }

            if (end === -1 && inInterval(this.ranges[i], interval.end)) {
                end = i + 1;

                if (start !== -1) break;
            }
        }

        return [ start, end ];
    }

    private advanceUntil(targetOffset: number) {
        for (; this.lastOffset < targetOffset; ++this.lastOffset) {
            const ch = this.source[this.lastOffset];
            if (ch === "\n" || ch === "\r") {
                ++this.lastLine;
                this.ranges.push({
                    start: this.ranges.length
                        ? this.ranges[this.ranges.length - 1].end + 1
                        : 0,

                    end: this.lastOffset,
                });
            }
        }
    }
}

function inInterval(interval: IInterval, value: number) {
    return interval.start <= value && value <= interval.end;
}
