# Web Scraper - Sitemap URL Checker

A tool to extract URLs from XML sitemaps and check for 404 (not found) pages.

## Installation

```bash
yarn install
```

## Usage

```bash
yarn start <sitemap-url>
```

### Example

```bash
yarn start https://efadhemon.dev/sitemap.xml
```

## Features

- **Sitemap Parsing**: Supports both sitemap index files and regular sitemaps
- **Recursive Processing**: Automatically follows nested sitemaps
- **404 Detection**: Checks each URL and identifies broken pages
- **JSON Output**: Saves results to the `output/` directory

## Output Files

After running, the tool creates two files in the `output/` folder:

| File             | Description                         |
| ---------------- | ----------------------------------- |
| `urls.json`      | All URLs extracted from the sitemap |
| `404-pages.json` | URLs that returned 404 errors       |

## How It Works

1. Fetches and parses the sitemap XML
2. Recursively extracts all page URLs
3. Saves all URLs to `output/urls.json`
4. Checks each URL for 404 status using HEAD requests
5. Saves broken URLs to `output/404-pages.json`

## Rate Limiting

The tool includes built-in delays:

- 500ms between sitemap requests
- 300ms between page checks

This helps avoid overloading target servers.

## Requirements

- Node.js 18+
- yarn
