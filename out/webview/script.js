"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientScript = getClientScript;
function getClientScript() {
    return `
const vscode = acquireVsCodeApi();
const searchInput = document.getElementById('searchInput');
const resultsHeader = document.getElementById('resultsHeader');
const resultsList = document.getElementById('resultsList');
const previewHeader = document.getElementById('previewHeader');
const previewContent = document.getElementById('previewContent');

let currentResults = [];
let allMatches = [];
let selectedMatchIndex = -1;
let currentQuery = '';
let fileContentsCache = {};
let searchTimeout;

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'searchResults':
            handleSearchResults(message.results);
            break;
        case 'fileContent':
            handleFileContent(message.filePath, message.content);
            break;
    }
});

searchInput.addEventListener('input', (e) => {
    const searchText = e.target.value.trim();

    if (!searchText) {
        clearResults();
        return;
    }

    currentQuery = searchText;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        vscode.postMessage({ command: 'search', text: searchText });
    }, 75);
});

function clearResults() {
    resultsList.innerHTML = '<div class="empty-state">Start typing to search...</div>';
    resultsHeader.textContent = 'No results';
    previewContent.innerHTML = '<div class="empty-state">Select a match to preview</div>';
    previewHeader.textContent = 'No file selected';
    currentResults = [];
    allMatches = [];
}

function handleSearchResults(results) {
    currentResults = results;
    allMatches = [];

    if (!results || results.length === 0) {
        resultsList.innerHTML = '<div class="empty-state">No results found</div>';
        resultsHeader.textContent = '0 results';
        previewContent.innerHTML = '<div class="empty-state">No results</div>';
        return;
    }

    results.forEach(file => {
        file.matches.forEach(match => {
            allMatches.push({
                filePath: file.filePath,
                relativePath: file.relativePath,
                line: match.line,
                text: match.text
            });
        });
    });

    renderResults(results);

    if (allMatches.length > 0) {
        selectMatchById(0);
    }
}

function renderResults(results) {
    const totalMatches = allMatches.length;
    resultsHeader.textContent = \`\${totalMatches} results in \${results.length} files\`;

    let html = '';
    results.forEach(file => {
        html += \`<div class="file-group">
            <div class="file-header">
                <span>\${escapeHtml(file.relativePath)}</span>
            </div>\`;

        file.matches.forEach(match => {
            const highlighted = highlightText(match.text, currentQuery);
            const matchId = allMatches.findIndex(m =>
                m.filePath === file.filePath && m.line === match.line
            );
            html += \`<div class="match-item" data-match-id="\${matchId}" onclick="selectMatchById(\${matchId})">
                <span class="match-line-number">[\${match.line}]</span>
                <span class="match-text">\${highlighted}</span>
            </div>\`;
        });

        html += '</div>';
    });

    resultsList.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightText(text, query) {
    if (!query) return escapeHtml(text);

    const escapedText = escapeHtml(text);
    const index = text.toLowerCase().indexOf(query.toLowerCase());

    if (index === -1) return escapedText;

    const before = escapeHtml(text.substring(0, index));
    const match = escapeHtml(text.substring(index, index + query.length));
    const after = escapeHtml(text.substring(index + query.length));

    return \`\${before}<span class="match-highlight">\${match}</span>\${after}\`;
}

window.selectMatchById = function(matchId) {
    if (matchId < 0 || matchId >= allMatches.length) return;

    selectedMatchIndex = matchId;
    const match = allMatches[matchId];

    document.querySelectorAll('.match-item').forEach(item => {
        item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(\`[data-match-id="\${matchId}"]\`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    previewHeader.textContent = match.relativePath;

    if (!fileContentsCache[match.filePath]) {
        vscode.postMessage({
            command: 'getFileContent',
            filePath: match.filePath
        });
    } else {
        displayFilePreview(match.filePath, match.line);
    }
};

function handleFileContent(filePath, content) {
    fileContentsCache[filePath] = content;

    if (selectedMatchIndex >= 0 && allMatches[selectedMatchIndex].filePath === filePath) {
        displayFilePreview(filePath, allMatches[selectedMatchIndex].line);
    }
}

function getLanguageFromExtension(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const languageMap = {
        'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript',
        'py': 'python', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
        'go': 'go', 'rs': 'rust', 'php': 'php', 'rb': 'ruby', 'swift': 'swift',
        'kt': 'kotlin', 'html': 'html', 'css': 'css', 'scss': 'scss', 'json': 'json',
        'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml', 'md': 'markdown', 'sh': 'bash', 'sql': 'sql'
    };
    return languageMap[ext] || 'plaintext';
}

function displayFilePreview(filePath, lineNumber) {
    const content = fileContentsCache[filePath];
    if (!content) return;

    const language = getLanguageFromExtension(filePath);

    const lines = content.split('\\n');
    const totalLines = lines.length;

    const MAX_LINES_TO_HIGHLIGHT = 500;
    let startHighlight = 0;
    let endHighlight = totalLines;

    if (totalLines > MAX_LINES_TO_HIGHLIGHT) {
        startHighlight = Math.max(0, lineNumber - Math.floor(MAX_LINES_TO_HIGHLIGHT / 2));
        endHighlight = Math.min(totalLines, startHighlight + MAX_LINES_TO_HIGHLIGHT);
        startHighlight = Math.max(0, endHighlight - MAX_LINES_TO_HIGHLIGHT);
    }

    let lineNumbersHtml = '';
    let linesHtml = '';

    for (let i = 0; i < totalLines; i++) {
        const isMatchLine = (i + 1) === lineNumber;
        lineNumbersHtml += \`<div class="preview-line-number \${isMatchLine ? 'match-line' : ''}" id="line-num-\${i + 1}">\${i + 1}</div>\`;

        let lineHtml;
        if (i >= startHighlight && i < endHighlight) {
            const line = lines[i];
            if (hljs.getLanguage(language)) {
                lineHtml = hljs.highlight(line, { language: language }).value;
            } else {
                lineHtml = hljs.highlightAuto(line).value;
            }

            if (isMatchLine) {
                lineHtml = highlightMatchInLine(lineHtml, currentQuery);
            }
        } else {
            lineHtml = lines[i].replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        linesHtml += \`<div class="code-line \${isMatchLine ? 'match-code-line' : ''}" id="code-line-\${i + 1}">\${lineHtml || '&nbsp;'}</div>\`;
    }

    previewContent.innerHTML = \`
        <div class="preview-code-container">
            <div class="preview-line-numbers">\${lineNumbersHtml}</div>
            <div class="preview-code-block">
                <pre><code class="hljs">\${linesHtml}</code></pre>
            </div>
        </div>
    \`;

    requestAnimationFrame(() => {
        const matchLineElement = document.getElementById('code-line-' + lineNumber);
        if (matchLineElement) {
            matchLineElement.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
    });
}

function highlightMatchInLine(lineHtml, query) {
    if (!query) return lineHtml;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = lineHtml;
    const text = tempDiv.textContent || tempDiv.innerText;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return lineHtml;
    return highlightText(lineHtml, query);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedMatchIndex < allMatches.length - 1) {
            selectMatchById(selectedMatchIndex + 1);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedMatchIndex > 0) {
            selectMatchById(selectedMatchIndex - 1);
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedMatchIndex >= 0) {
            const match = allMatches[selectedMatchIndex];
            vscode.postMessage({
                command: 'openFile',
                filePath: match.filePath,
                line: match.line
            });
        }
    } else if (e.key === 'Escape') {
        vscode.postMessage({ command: 'close' });
    }
});

searchInput.focus();
`;
}
//# sourceMappingURL=script.js.map