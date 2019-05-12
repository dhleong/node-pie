export enum TokenType {
    LITERAL,
}

export interface ITokenizer {
    peek(): void;
}
