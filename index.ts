import axios from "axios";

import * as fs from "fs";
import { promisify } from "util";
import { parseString } from "xml2js";
import { runLoadTest, printLoadTestSummary } from "./load-test.js";

const parseXML = promisify(parseString);

// Proper interfaces for sitemap XML structure
interface SitemapUrl {
  loc: string[];
  lastmod?: string[];
  changefreq?: string[];
  priority?: string[];
}

interface SitemapUrlSet {
  url: SitemapUrl[];
}

interface SitemapEntry {
  loc: string[];
  lastmod?: string[];
}

interface SitemapIndex {
  sitemap: SitemapEntry[];
}

interface ParsedSitemap {
  urlset?: SitemapUrlSet;
  sitemapIndex?: SitemapIndex;
}

// Extract URLs from sitemap XML
async function extractUrlsFromSitemap(sitemapUrl: string, visitedSitemaps: Set<string>): Promise<string[]> {
  if (visitedSitemaps.has(sitemapUrl)) {
    console.log(`Skipping already processed sitemap: ${sitemapUrl}`);
    return [];
  }

  visitedSitemaps.add(sitemapUrl);
  console.log(`Processing sitemap: ${sitemapUrl}`);

  try {
    const { data } = await axios.get(sitemapUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SitemapBot/1.0)",
        Accept: "application/xml, text/xml, */*",
      },
    });

    const result: ParsedSitemap = (await parseXML(data)) as ParsedSitemap;
    const urls: string[] = [];

    // Check if this is a sitemap index (contains other sitemaps)
    if (result.sitemapIndex && result.sitemapIndex.sitemap) {
      console.log(`Found sitemap index with ${result.sitemapIndex.sitemap.length} entries`);

      const sitemaps: SitemapEntry[] = result.sitemapIndex.sitemap;
      for (const sitemap of sitemaps) {
        if (sitemap.loc && sitemap.loc[0]) {
          const childUrl: string = sitemap.loc[0];

          // Check if this is another sitemap (.xml) or a webpage
          if (childUrl.endsWith(".xml")) {
            console.log(`Found child sitemap: ${childUrl}`);
            // Add delay between sitemap requests
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Recursively extract URLs from child sitemap
            const childUrls = await extractUrlsFromSitemap(childUrl, visitedSitemaps);
            urls.push(...childUrls);
            console.log(`Got ${childUrls.length} URLs from child sitemap: ${childUrl}`);
          } else {
            // This is a webpage URL
            console.log(`Found webpage URL: ${childUrl}`);
            urls.push(childUrl);
          }
        }
      }
    }
    // Regular sitemap with URLs (could be mix of sitemaps and pages)
    else if (result.urlset && result.urlset.url) {
      console.log(`Found urlset with ${result.urlset.url.length} entries`);

      const urlEntries: SitemapUrl[] = result.urlset.url;
      for (const urlEntry of urlEntries) {
        if (urlEntry.loc && urlEntry.loc[0]) {
          const entryUrl: string = urlEntry.loc[0];

          // Check if this is another sitemap (.xml) or a webpage
          if (entryUrl.endsWith(".xml")) {
            console.log(`Found child sitemap in urlset: ${entryUrl}`);
            // Add delay between sitemap requests
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Recursively extract URLs from child sitemap
            const childUrls = await extractUrlsFromSitemap(entryUrl, visitedSitemaps);
            urls.push(...childUrls);
            console.log(`Got ${childUrls.length} URLs from child sitemap: ${entryUrl}`);
          } else {
            // This is a webpage URL
            console.log(`Found webpage URL in urlset: ${entryUrl}`);
            urls.push(entryUrl);
          }
        }
      }
    }

    console.log(`Total webpage URLs extracted from ${sitemapUrl}: ${urls.length}`);
    return urls;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to process sitemap ${sitemapUrl}:`, errorMessage);
    return [];
  }
}

export async function scrapePage(url: string) {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    return data;
  } catch (error) {
    throw error;
  }
}

export async function checkPageExist(url: string): Promise<boolean> {
  try {
    await axios.head(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Ensure output directory exists
if (!fs.existsSync("output")) {
  fs.mkdirSync("output", { recursive: true });
}

// Display usage information
function showUsage() {
  console.log("Usage:");
  console.log("  yarn start <sitemap-url>                              - Extract URLs and check for 404s");
  console.log("  yarn start loadtest [options]                         - Run load test on extracted URLs");
  console.log("");
  console.log("Load Test Options:");
  console.log("  --concurrency <num>     Number of concurrent requests (default: 10)");
  console.log("  --requests <num>        Requests per URL (default: 1)");
  console.log("  --duration <seconds>    Max duration for the test (optional)");
  console.log("  --urls <file>           Path to URLs JSON file (default: output/urls.json)");
  console.log("");
  console.log("Examples:");
  console.log("  yarn start https://viewsbangladesh.com/sitemap.xml");
  console.log("  yarn start loadtest --concurrency 20 --requests 5");
  console.log("  yarn start loadtest --concurrency 50 --duration 60");
}

// Load test command
if (command === "loadtest") {
  const concurrencyIndex = args.indexOf("--concurrency");
  const requestsIndex = args.indexOf("--requests");
  const durationIndex = args.indexOf("--duration");
  const urlsIndex = args.indexOf("--urls");

  const concurrency = concurrencyIndex !== -1 ? parseInt(args[concurrencyIndex + 1]) : 10;
  const requestsPerUrl = requestsIndex !== -1 ? parseInt(args[requestsIndex + 1]) : 1;
  const durationArg = durationIndex !== -1 ? parseInt(args[durationIndex + 1]) : undefined;
  const urlsFile = urlsIndex !== -1 ? args[urlsIndex + 1] : "output/urls.json";

  // Load URLs from file
  if (!fs.existsSync(urlsFile)) {
    console.error(`Error: URLs file not found: ${urlsFile}`);
    console.error("Run the scraper first to extract URLs, or specify a different file with --urls");
    process.exit(1);
  }

  const urlsData = fs.readFileSync(urlsFile, "utf-8");
  const urls: string[] = JSON.parse(urlsData);

  if (urls.length === 0) {
    console.error("Error: No URLs found in the file");
    process.exit(1);
  }

  console.log(`Loaded ${urls.length} URLs from ${urlsFile}`);

  // Run load test
  const { results, summary } = await runLoadTest(urls, {
    concurrency,
    requestsPerUrl,
    duration: durationArg,
  });

  // Print summary
  printLoadTestSummary(summary);

  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsFile = `output/loadtest-results-${timestamp}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify({ summary, results }, null, 2));
  console.log(`Detailed results saved to ${resultsFile}`);

  // Save summary
  const summaryFile = `output/loadtest-summary-${timestamp}.json`;
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`Summary saved to ${summaryFile}`);
}
// Scrape and check 404s (default behavior)
else if (command && !command.startsWith("--")) {
  const sitemapUrl: string = command;

  const urls: string[] = await extractUrlsFromSitemap(sitemapUrl, new Set<string>());
  console.log(`Extracted URLs: ${urls.length}`);

  const jsonOutput = JSON.stringify(urls, null, 2);
  fs.writeFileSync("output/urls.json", jsonOutput);
  console.log("URLs saved to output/urls.json");

  // Check each URL for 404s
  console.log("\nChecking pages for 404 errors...");
  const notFoundUrls: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const exists = await checkPageExist(url);
      if (!exists) {
        notFoundUrls.push(url);
        console.log(`[${i + 1}/${urls.length}] 404 Not Found: ${url}`);
      } else {
        console.log(`[${i + 1}/${urls.length}] OK: ${url}`);
      }
    } catch (error) {
      console.error(`[${i + 1}/${urls.length}] Error checking ${url}:`, error instanceof Error ? error.message : error);
    }
    // Delay between requests
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Save 404 URLs to JSON file
  const notFoundOutput = JSON.stringify(notFoundUrls, null, 2);
  fs.writeFileSync("output/404-pages.json", notFoundOutput);
  console.log(`\nFound ${notFoundUrls.length} pages returning 404`);
  console.log("404 pages saved to output/404-pages.json");

  console.log("\n💡 Tip: Run 'yarn start loadtest' to perform a load test on these URLs");
} else {
  showUsage();
  process.exit(1);
}
