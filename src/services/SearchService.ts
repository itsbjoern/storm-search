import * as vscode from 'vscode';
import { FileSearchResult, SearchMatch, SearchOptions } from '../types';
import { EXCLUDE_PATTERNS, BINARY_EXTENSIONS, DEFAULT_SEARCH_OPTIONS } from '../constants';

export class SearchService {
    private options: SearchOptions;

    constructor(options: Partial<SearchOptions> = {}) {
        this.options = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    }

    async search(query: string): Promise<FileSearchResult[]> {
        if (!query) {
            return [];
        }

        const fileMatchMap = new Map<string, SearchMatch[]>();
        const excludeGlob = `{${EXCLUDE_PATTERNS.join(',')}}`;

        const files = await vscode.workspace.findFiles('**/*', excludeGlob, 1000);
        const textFiles = this.filterTextFiles(files);
        const filesToSearch = textFiles.slice(0, this.options.maxFilesToSearch);
        const queryLower = query.toLowerCase();

        await this.searchInBatches(filesToSearch, queryLower, fileMatchMap);

        return this.convertMapToResults(fileMatchMap);
    }

    private filterTextFiles(files: vscode.Uri[]): vscode.Uri[] {
        return files.filter(file => {
            const ext = file.fsPath.split('.').pop()?.toLowerCase() || '';
            return !BINARY_EXTENSIONS.has(ext);
        });
    }

    private async searchInBatches(
        files: vscode.Uri[],
        queryLower: string,
        fileMatchMap: Map<string, SearchMatch[]>
    ): Promise<void> {
        for (let i = 0; i < files.length && fileMatchMap.size < this.options.maxResults; i += this.options.batchSize) {
            const batch = files.slice(i, i + this.options.batchSize);
            const results = await this.searchBatch(batch, queryLower);

            for (const result of results) {
                if (result && fileMatchMap.size < this.options.maxResults) {
                    fileMatchMap.set(result.filePath, result.matches);
                }
            }
        }
    }

    private async searchBatch(
        batch: vscode.Uri[],
        queryLower: string
    ): Promise<Array<{ filePath: string; matches: SearchMatch[] } | null>> {
        return Promise.all(batch.map(async (file) => {
            try {
                const stat = await vscode.workspace.fs.stat(file);

                if (stat.size > this.options.maxFileSize) {
                    return null;
                }

                const uint8Array = await vscode.workspace.fs.readFile(file);
                const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
                const textLower = text.toLowerCase();

                if (!textLower.includes(queryLower)) {
                    return null;
                }

                const matches = this.findMatchesInFile(file, text, textLower, queryLower);
                return matches.length > 0 ? { filePath: file.fsPath, matches } : null;
            } catch (error) {
                return null;
            }
        }));
    }

    private findMatchesInFile(
        file: vscode.Uri,
        text: string,
        textLower: string,
        queryLower: string
    ): SearchMatch[] {
        const lines = text.split('\n');
        const matches: SearchMatch[] = [];
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
        const relativePath = workspaceFolder
            ? vscode.workspace.asRelativePath(file, false)
            : file.fsPath;

        for (let i = 0; i < lines.length && matches.length < this.options.maxMatchesPerFile; i++) {
            const line = lines[i];
            const lineLower = line.toLowerCase();

            if (lineLower.includes(queryLower)) {
                matches.push({
                    filePath: file.fsPath,
                    relativePath,
                    line: i + 1,
                    column: lineLower.indexOf(queryLower),
                    text: line.trim()
                });
            }
        }

        return matches;
    }

    private convertMapToResults(fileMatchMap: Map<string, SearchMatch[]>): FileSearchResult[] {
        const results: FileSearchResult[] = [];

        fileMatchMap.forEach((matches, filePath) => {
            results.push({
                filePath,
                relativePath: matches[0].relativePath,
                matches
            });
        });

        return results;
    }
}
