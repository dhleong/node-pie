
export interface ILint {
    column: number;
    line: number;
    message: string;
    type: "error" | "warn";
}
