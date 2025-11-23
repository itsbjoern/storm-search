"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewContent = getWebviewContent;
const styles_1 = require("./styles");
const script_1 = require("./script");
function getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    ${(0, styles_1.getStyles)()}
</head>
<body>
    <div class="search-header">
        <input
            type="text"
            class="search-input"
            id="searchInput"
            placeholder="Search everywhere..."
            autofocus
        />
    </div>

    <div class="content-container">
        <div class="results-panel">
            <div class="results-header" id="resultsHeader">
                No results
            </div>
            <div class="results-list" id="resultsList">
                <div class="empty-state">Start typing to search...</div>
            </div>
        </div>

        <div class="preview-panel">
            <div class="preview-header" id="previewHeader">
                No file selected
            </div>
            <div class="preview-content" id="previewContent">
                <div class="empty-state">Select a match to preview</div>
            </div>
        </div>
    </div>

    <script>
        ${(0, script_1.getClientScript)()}
    </script>
</body>
</html>`;
}
//# sourceMappingURL=webviewContent.js.map