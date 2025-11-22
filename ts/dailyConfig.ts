// 定义 config 文件的结构
export interface DailyConfig {
    'daily-notes'?: {
        folder: string;
        format: string;
        extension: string;
        openOnCreate: boolean;
        template?: string;
        // ... 其他可能的配置项
    };
}