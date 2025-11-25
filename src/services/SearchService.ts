import * as vscode from 'vscode';
import { FileSearchResult, SearchMatch, SearchOptions } from '../types';
import { EXCLUDE_PATTERNS, BINARY_EXTENSIONS, DEFAULT_SEARCH_OPTIONS } from '../constants';
import { escapeRegExp } from '../util';

export class SearchService {
    private options: SearchOptions;

    constructor(options: Partial<SearchOptions> = {}) {
        this.options = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    }

    getSearchOptions(): SearchOptions {
        return this.options;
    }

    async getSearchableFiles(): Promise<vscode.Uri[]> {
        const allExcludePatterns = EXCLUDE_PATTERNS;
        for (const binaryExtension of BINARY_EXTENSIONS) {
            allExcludePatterns.push(`**/*.${binaryExtension}`);
        }
        const excludeGlob = `{${allExcludePatterns.join(',')}}`;
        const cancellationTokenSource = new vscode.CancellationTokenSource();
        const timer = setTimeout(() => {
            cancellationTokenSource.cancel();
            cancellationTokenSource.dispose();
        }, 1000);

        const files = await vscode.workspace.findFiles('**/*', excludeGlob, this.options.maxFilesToSearch, cancellationTokenSource.token);;
        clearTimeout(timer);
        cancellationTokenSource.dispose();

        return files;
    }

    async search(files: vscode.Uri[], query: string): Promise<FileSearchResult[]> {
        const fileMatchMap = new Map<string, SearchMatch[]>();
        if (!query) {
            return [];
        }

        const queryLower = query.toLowerCase();
        await this.searchInBatches(files, queryLower, fileMatchMap);
        return this.convertMapToResults(fileMatchMap);
    }

    private async searchInBatches(
        files: vscode.Uri[],
        queryLower: string,
        fileMatchMap: Map<string, SearchMatch[]>
    ): Promise<void> {
        for (let i = 0; i < files.length; i += this.options.batchSize) {
            if (this.options.maxResults && fileMatchMap.size >= this.options.maxResults) {
                break;
            }

            const batch = files.slice(i, i + this.options.batchSize);
            const results = await this.searchBatch(batch, queryLower);

            for (const result of results) {
                if (result) {
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
        const regularLines = text.split('\n');
        const lowerLines = textLower.split('\n');
        const matches: SearchMatch[] = [];
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
        const relativePath = workspaceFolder
            ? vscode.workspace.asRelativePath(file, false)
            : file.fsPath;

        const matchExp = new RegExp(escapeRegExp(queryLower), 'g');
        for (let i = 0; i < lowerLines.length; i++) {
            if (this.options.maxMatchesPerFile && matches.length >= this.options.maxMatchesPerFile) {
                break;
            }

            const regularLine = regularLines[i].trim();
            const lowerLine = lowerLines[i].trim();
            const lineMatches = lowerLine.matchAll(matchExp);

            for (const match of lineMatches) {
                matches.push({
                    filePath: file.fsPath,
                    relativePath,
                    line: i + 1,
                    column: match.index !== undefined ? match.index : 0,
                    text: regularLine
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
