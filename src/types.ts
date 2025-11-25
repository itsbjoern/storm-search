export interface SearchMatch {
    filePath: string;
    relativePath: string;
    line: number;
    column: number;
    text: string;
}

export interface FileSearchResult {
    filePath: string;
    relativePath: string;
    matches: SearchMatch[];
}

export interface WebviewMessage {
    command: 'search' | 'getFileContent' | 'openFile' | 'close';
    text?: string;
    filePath?: string;
    line?: number;
}

export interface SearchOptions {
    maxResults?: number;
    maxMatchesPerFile?: number;
    maxFilesToSearch?: number;
    maxFileSize: number;
    batchSize: number;
}
