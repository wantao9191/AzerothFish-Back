declare module 'pdfkit' {
    interface PDFDocumentOptions {
        size?: string | [number, number];
        margins?: {
            top: number;
            bottom: number;
            left: number;
            right: number;
        };
        autoFirstPage?: boolean;
        bufferPages?: boolean;
    }

    interface TextOptions {
        align?: 'left' | 'center' | 'right' | 'justify';
        lineGap?: number;
        paragraphGap?: number;
        indent?: number;
        width?: number;
        height?: number;
        ellipsis?: boolean | string;
        columns?: number;
        columnGap?: number;
        continued?: boolean;
    }

    class PDFDocument {
        constructor(options?: PDFDocumentOptions);
        
        on(event: 'data', listener: (chunk: Buffer) => void): this;
        on(event: 'end', listener: () => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        
        fontSize(size: number): this;
        font(font: string): this;
        text(text: string, options?: TextOptions): this;
        text(text: string, x: number, y: number, options?: TextOptions): this;
        moveDown(lines?: number): this;
        end(): void;
    }

    export = PDFDocument;
}
