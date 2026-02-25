# Web Scraper & Load Tester

A powerful tool to extract URLs from XML sitemaps, check for 404 errors, and perform load testing on websites.

## Installation

```bash
yarn install
```

## Usage

### 1. Extract URLs and Check for 404s

```bash
yarn start <sitemap-url>
```

**Example:**

```bash
yarn start https://viewsbangladesh.com/sitemap.xml
```

This will:

- Extract all URLs from the sitemap
- Save URLs to `output/urls.json`
- Check each URL for 404 errors
- Save 404 URLs to `output/404-pages.json`

### 2. Run Load Tests

```bash
yarn start loadtest [options]
```

**Load Test Options:**

| Option                 | Description                              | Default          |
| ---------------------- | ---------------------------------------- | ---------------- |
| `--concurrency <num>`  | Number of concurrent requests            | 10               |
| `--requests <num>`     | Number of requests per URL               | 1                |
| `--duration <seconds>` | Maximum duration for the test (optional) | -                |
| `--urls <file>`        | Path to URLs JSON file                   | output/urls.json |

**Load Test Examples:**

```bash
# Basic load test with default settings (10 concurrent requests)
yarn start loadtest

# Custom concurrency - 20 concurrent requests
yarn start loadtest --concurrency 20

# Stress test - each URL gets 5 requests, 10 concurrent
yarn start loadtest --concurrency 10 --requests 5

# Time-limited test - run for 60 seconds with 50 concurrent requests
yarn start loadtest --concurrency 50 --duration 60

# Use a custom URLs file
yarn start loadtest --urls custom-urls.json --concurrency 15

# Heavy load test - 100 concurrent requests
yarn start loadtest --concurrency 100 --requests 3
```

## Features

### Sitemap Scraping

- **Sitemap Parsing**: Supports both sitemap index files and regular sitemaps
- **Recursive Processing**: Automatically follows nested sitemaps
- **404 Detection**: Checks each URL and identifies broken pages
- **JSON Output**: Saves results to the `output/` directory

### Load Testing

- **Concurrent Requests**: Configurable parallel request handling
- **Performance Metrics**: Response times, success rates, throughput
- **Flexible Testing**: Test by request count or duration
- **Detailed Reports**: JSON output with comprehensive statistics
- **Real-time Progress**: Live feedback during testing

## Output Files

### Sitemap Scraping Output

| File             | Description                         |
| ---------------- | ----------------------------------- |
| `urls.json`      | All URLs extracted from the sitemap |
| `404-pages.json` | URLs that returned 404 errors       |

### Load Test Output

| File                                | Description                         |
| ----------------------------------- | ----------------------------------- |
| `loadtest-summary-<timestamp>.json` | Summary statistics of the load test |
| `loadtest-results-<timestamp>.json` | Detailed per-request data           |

## Load Test Metrics

The load test provides comprehensive metrics:

- **Total Requests** - Number of requests made
- **Success/Failure Rates** - Percentage breakdown with counts
- **Response Times** - Average, minimum, and maximum
- **Throughput** - Requests per second
- **Status Code Distribution** - Breakdown of HTTP status codes (200, 404, 500, etc.)
- **Error Analysis** - Types and counts of errors encountered

**Example Summary Output:**

```
=== Load Test Summary ===
Total Requests: 250
Successful: 245 (98.00%)
Failed: 5 (2.00%)

Response Times:
  Average: 245.32ms
  Min: 120ms
  Max: 890ms

Throughput:
  Requests/sec: 15.62
  Duration: 16.01s

Status Code Distribution:
  200: 245
  404: 3
  500: 2
========================
```

## How It Works

### Sitemap Scraping

1. Fetches and parses the sitemap XML
2. Recursively extracts all page URLs
3. Saves all URLs to `output/urls.json`
4. Checks each URL for 404 status using HEAD requests
5. Saves broken URLs to `output/404-pages.json`

### Load Testing

1. Loads URLs from the specified JSON file
2. Creates a request queue based on configuration
3. Executes requests with controlled concurrency
4. Tracks response times and status codes
5. Generates comprehensive reports

## Rate Limiting

The tool includes built-in delays:

## Rate Limiting

The sitemap scraper includes built-in delays:

- 500ms between sitemap requests
- 300ms between page checks

This helps avoid overloading target servers.

**For load testing**, you control the rate through the `--concurrency` option. Start with lower values and increase gradually to avoid overwhelming the target server.

## Use Cases

- **Website Health Checks** - Verify all pages are accessible
- **Migration Validation** - Ensure all URLs work after site migration
- **Performance Testing** - Test how your site handles traffic
- **Capacity Planning** - Determine maximum load your site can handle
- **SEO Auditing** - Find broken links that hurt search rankings

## Requirements

- Node.js 18+
- yarn

## Tips for Load Testing

1. **Start Small** - Begin with low concurrency (5-10) to establish baseline
2. **Gradually Increase** - Increment concurrency to find breaking points
3. **Monitor Server** - Watch server metrics during tests
4. **Respect Resources** - Don't overwhelm servers, especially production ones
5. **Use Duration Limits** - Set `--duration` for sustained load testing
6. **Test During Off-Peak** - Run heavy tests when traffic is low
