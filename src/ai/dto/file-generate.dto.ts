export interface FileGenerateInput {
    format: string;
    content: string;
}

/**
 * 文档格式设置
 */
export interface DocumentSettings {
    /** 行距（如：1.5, 2.0） */
    line_height?: number | string;
    /** 字号（如：12pt, 小四） */
    font_size?: string;
    /** 字体（如：宋体, 微软雅黑） */
    font_family?: string;
    /** 标题字号 */
    title_font_size?: string;
    /** 页边距 */
    margin?: string;
    /** 首行缩进 */
    text_indent?: string;
    /** 其他自定义设置 */
    [key: string]: any;
}

export interface FileGenerateOutput {
    /** 格式化后的文档内容（不包含设置说明） */
    file_url: string;
    /** 文档格式设置（供文件生成服务使用） */
    settings?: DocumentSettings;
}