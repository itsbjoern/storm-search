"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("../constants");
class SearchService {
    constructor(options = {}) {
        this.options = { ...constants_1.DEFAULT_SEARCH_OPTIONS, ...options };
    }
    async search(query) {
        if (!query) {
            return [];
        }
        const fileMatchMap = new Map();
        const excludeGlob = `{${constants_1.EXCLUDE_PATTERNS.join(',')}}`;
        const files = await vscode.workspace.findFiles('**/*', excludeGlob, 1000);
        const textFiles = this.filterTextFiles(files);
        const filesToSearch = textFiles.slice(0, this.options.maxFilesToSearch);
        const queryLower = query.toLowerCase();
        await this.searchInBatches(filesToSearch, queryLower, fileMatchMap);
        return this.convertMapToResults(fileMatchMap);
    }
    filterTextFiles(files) {
        return files.filter(file => {
            const ext = file.fsPath.split('.').pop()?.toLowerCase() || '';
            return !constants_1.BINARY_EXTENSIONS.has(ext);
        });
    }
    async searchInBatches(files, queryLower, fileMatchMap) {
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
    async searchBatch(batch, queryLower) {
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
            }
            catch (error) {
                return null;
            }
        }));
    }
    findMatchesInFile(file, text, textLower, queryLower) {
        const lines = text.split('\n');
        const matches = [];
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
    convertMapToResults(fileMatchMap) {
        const results = [];
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
exports.SearchService = SearchService;
//# sourceMappingURL=SearchService.js.map