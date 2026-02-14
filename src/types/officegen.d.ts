declare module 'officegen' {
    interface Officegen {
        on(event: 'data', listener: (chunk: Buffer) => void): this;
        on(event: 'end', listener: () => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        createP(): Paragraph;
        generate(): void;
    }

    interface Paragraph {
        addText(text: string, options?: {
            font_face?: string;
            font_size?: number;
            bold?: boolean;
            italic?: boolean;
        }): void;
        addLineBreak(): void;
    }

    function officegen(type: 'docx' | 'pptx' | 'xlsx'): Officegen;
    
    export = officegen;
}
