
export interface ILint {
    column: number;
    line: number;
    message: string;
    type: "error" | "warn";

    /**
     * If provided, the length of the string starting at (column,line)
     * that this lint covers
     */
    length?: number;
}
