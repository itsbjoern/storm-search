# Architecture

This document describes the clean code architecture of the Storm Search extension.

## Project Structure

```
src/
├── extension.ts              # Entry point - minimal, just registers commands
├── WebviewManager.ts         # Manages webview panel lifecycle and message routing
├── types.ts                  # TypeScript interfaces and types
├── constants.ts              # Configuration constants and defaults
├── services/
│   ├── SearchService.ts      # Handles file searching logic
│   └── FileService.ts        # Handles file operations
└── webview/
    ├── webviewContent.ts     # Main HTML template
    ├── styles.ts             # CSS styles
    └── script.ts             # Client-side JavaScript
```

## Design Principles

### Separation of Concerns
- **extension.ts**: Minimal entry point that only handles activation/deactivation
- **WebviewManager**: Manages webview lifecycle and routes messages to appropriate services
- **Services**: Encapsulate specific functionality (search, file operations)
- **Webview**: Separated into content, styles, and scripts for maintainability

### Single Responsibility
Each class/module has one clear responsibility:
- `SearchService`: File searching
- `FileService`: File reading and opening
- `WebviewManager`: Webview lifecycle management
- Constants and types are separated for reusability

### Dependency Injection
Services are instantiated in `WebviewManager` and can be easily tested or replaced.

### Type Safety
All data structures are properly typed in `types.ts`:
- `SearchMatch`: Represents a single match
- `FileSearchResult`: Represents results for a file
- `WebviewMessage`: Messages from webview to extension
- `SearchOptions`: Configurable search parameters

## Key Components

### SearchService
Handles all search-related operations:
- File filtering (text vs binary)
- Batch processing for performance
- Match finding within files
- Result aggregation

### FileService
Handles file operations:
- Reading file contents
- Opening files at specific locations

### WebviewManager
Orchestrates the webview:
- Panel creation and disposal
- Message routing between webview and services
- Result posting back to webview

## Extension Flow

1. User triggers command → `extension.ts` → `WebviewManager.show()`
2. WebviewManager creates panel with HTML from `webview/`
3. User types search → webview posts message
4. WebviewManager routes to `SearchService`
5. Results posted back to webview
6. User selects result → `FileService` opens file

## Benefits of This Architecture

1. **Maintainability**: Each file has a clear purpose
2. **Testability**: Services can be tested independently
3. **Scalability**: Easy to add new features or services
4. **Readability**: No 800+ line files, everything is organized
5. **Reusability**: Constants and types can be shared across modules
