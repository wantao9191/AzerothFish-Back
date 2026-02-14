import { FileGenerateOutput } from '@/ai/dto/file-generate.dto';

/**
 * 文档生成服务
 * 使用固定模板，将纯文本内容生成各种格式的文档
 * 注意：officegen 和 pdfkit 使用动态导入，避免编译时依赖问题
 */
export class DocumentGenerator {
    /**
     * 从纯文本生成文档（推荐使用）
     * @param content 纯文本内容
     * @param format 目标格式
     * @returns Buffer 文档的二进制数据
     */
    static async generateFromText(content: string, format: string): Promise<Buffer> {
        // 使用默认设置和固定模板
        const output: FileGenerateOutput = {
            file_url: content,
            settings: this.getDefaultSettings(format)
        };
        return await this.generate(output, format);
    }

    /**
     * 生成文档（兼容旧接口）
     * @param output FileGenerateOutput（包含内容和样式设置）
     * @param format 目标格式
     * @returns Buffer 文档的二进制数据
     */
    static async generate(output: FileGenerateOutput, format: string): Promise<Buffer> {
        switch (format.toLowerCase()) {
            case 'docx':
                return await this.generateDocx(output);
            case 'pdf':
                return await this.generatePdf(output);
            case 'txt':
                return Buffer.from(output.file_url, 'utf-8');
            case 'html':
                return Buffer.from(output.file_url, 'utf-8');
            case 'markdown':
                return Buffer.from(output.file_url, 'utf-8');
            default:
                throw new Error(`不支持的格式: ${format}`);
        }
    }

    /**
     * 生成 DOCX 文档
     */
    private static async generateDocx(output: FileGenerateOutput): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // 动态导入 officegen，避免编译时依赖问题
                const officegen = (await import('officegen')).default;
                const docx = officegen('docx');
                const chunks: Buffer[] = [];

                // 监听数据流
                docx.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                // 生成完成
                docx.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });

                // 错误处理
                docx.on('error', (err: Error) => {
                    reject(err);
                });

                // 应用样式设置（从 settings 获取）
                const settings = output.settings || {};
                const fontSize = settings.font_size ? parseInt(settings.font_size) : 12;
                const lineHeight = settings.line_height || 1.5;
                const fontFamily = settings.font_family || '宋体';

                // 智能解析内容并添加到文档
                const lines = output.file_url.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    if (!line.trim()) {
                        // 空行，添加间距
                        docx.createP().addLineBreak();
                        continue;
                    }

                    const pObj = docx.createP();
                    
                    // 识别标题（Markdown格式或自动判断）
                    if (line.startsWith('# ')) {
                        pObj.addText(line.substring(2), {
                            font_face: fontFamily,
                            font_size: fontSize + 4,
                            bold: true
                        });
                    } else if (line.startsWith('## ')) {
                        pObj.addText(line.substring(3), {
                            font_face: fontFamily,
                            font_size: fontSize + 2,
                            bold: true
                        });
                    } else if (line.startsWith('### ')) {
                        pObj.addText(line.substring(4), {
                            font_face: fontFamily,
                            font_size: fontSize + 1,
                            bold: true
                        });
                    } else if (line.startsWith('---')) {
                        // 分隔线
                        docx.createP().addLineBreak();
                    } else if (i === 0 && line.length < 50) {
                        // 第一行且较短，可能是标题
                        pObj.addText(line, {
                            font_face: fontFamily,
                            font_size: fontSize + 2,
                            bold: true
                        });
                    } else {
                        // 普通段落（首行添加两个全角空格作为缩进）
                        const indentedLine = '　　' + line; // 两个全角空格
                        this.parseInlineMarkdown(pObj, indentedLine, fontFamily, fontSize);
                    }
                }

                // 生成文档
                docx.generate();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 解析行内 Markdown 标记（粗体、斜体）
     */
    private static parseInlineMarkdown(paragraph: any, text: string, fontFamily: string, fontSize: number) {
        // 简化处理：去除 Markdown 标记，添加文本
        // 在实际应用中可以更精细地处理粗体、斜体等
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')  // 粗体
            .replace(/\*(.*?)\*/g, '$1')       // 斜体
            .replace(/`(.*?)`/g, '$1');        // 代码

        paragraph.addText(cleanText, {
            font_face: fontFamily,
            font_size: fontSize
        });
    }

    /**
     * 生成 PDF 文档
     */
    private static async generatePdf(output: FileGenerateOutput): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // 动态导入 pdfkit，避免编译时依赖问题
                const PDFDocument = (await import('pdfkit')).default;
                const chunks: Buffer[] = [];
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 72,
                        bottom: 72,
                        left: 90,
                        right: 90
                    }
                });

                // 监听数据流
                doc.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                // 生成完成
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });

                // 错误处理
                doc.on('error', (err: Error) => {
                    reject(err);
                });

                // 应用样式设置
                const settings = output.settings || {};
                const fontSize = settings.font_size ? parseInt(settings.font_size) : 12;
                const lineHeight = typeof settings.line_height === 'number' 
                    ? settings.line_height 
                    : (typeof settings.line_height === 'string' ? parseFloat(settings.line_height) : 1.8);

                // 如果是 HTML 格式，需要提取文本内容
                let content = output.file_url;
                if (content.includes('<!DOCTYPE html>')) {
                    // 简单提取 HTML 中的文本（实际应用中可能需要更复杂的解析）
                    content = content
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                        .replace(/<[^>]+>/g, '\n')
                        .replace(/\n\s*\n/g, '\n\n')
                        .trim();
                }

                // 添加内容
                const lines = content.split('\n');
                for (const line of lines) {
                    if (!line.trim()) {
                        doc.moveDown();
                        continue;
                    }

                    // 识别标题
                    if (line.startsWith('# ')) {
                        doc.fontSize(fontSize + 6)
                            .font('Helvetica-Bold')
                            .text(line.substring(2), { align: 'left' })
                            .moveDown();
                    } else if (line.startsWith('## ')) {
                        doc.fontSize(fontSize + 4)
                            .font('Helvetica-Bold')
                            .text(line.substring(3), { align: 'left' })
                            .moveDown(0.5);
                    } else if (line.startsWith('### ')) {
                        doc.fontSize(fontSize + 2)
                            .font('Helvetica-Bold')
                            .text(line.substring(4), { align: 'left' })
                            .moveDown(0.5);
                    } else if (line.startsWith('---')) {
                        doc.moveDown();
                    } else {
                        // 普通段落
                        const cleanText = line
                            .replace(/\*\*(.*?)\*\*/g, '$1')
                            .replace(/\*(.*?)\*/g, '$1')
                            .replace(/`(.*?)`/g, '$1');

                        doc.fontSize(fontSize)
                            .font('Helvetica')
                            .text(cleanText, {
                                align: 'left',
                                lineGap: fontSize * (lineHeight - 1)
                            });
                    }
                }

                // 结束文档
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取默认样式设置
     */
    private static getDefaultSettings(format: string): any {
        switch (format.toLowerCase()) {
            case 'docx':
                return {
                    font_family: '宋体',
                    font_size: '12pt',
                    line_height: 1.5,
                    title_font_size: '15pt',
                    text_indent: '2em'
                };
            case 'pdf':
                return {
                    page_size: 'A4',
                    font_size: '12pt',
                    line_height: 1.8,
                    margin_top: '2.54cm',
                    margin_bottom: '2.54cm'
                };
            case 'html':
                return {
                    font_family: 'PingFang SC, Microsoft YaHei, sans-serif',
                    font_size: '16px',
                    line_height: 1.6
                };
            default:
                return {};
        }
    }
}
