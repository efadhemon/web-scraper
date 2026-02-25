import axios from "axios";

// Load test interfaces
export interface LoadTestResult {
  url: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  timestamp: number;
}

export interface LoadTestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  duration: number;
  statusCodeDistribution: Record<number, number>;
  errors: Record<string, number>;
}

// Load test a single URL
async function loadTestUrl(url: string): Promise<LoadTestResult> {
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      validateStatus: () => true, // Accept any status code
    });

    const responseTime = Date.now() - startTime;

    return {
      url,
      success: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      responseTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      url,
      success: false,
      responseTime,
      error: errorMessage,
      timestamp: Date.now(),
    };
  }
}

// Run load test with concurrent requests
export async function runLoadTest(
  urls: string[],
  options: {
    concurrency?: number;
    requestsPerUrl?: number;
    duration?: number;
  } = {},
): Promise<{ results: LoadTestResult[]; summary: LoadTestSummary }> {
  const concurrency = options.concurrency || 10;
  const requestsPerUrl = options.requestsPerUrl || 1;
  const duration = options.duration; // Optional duration in seconds

  console.log("\n=== Starting Load Test ===");
  console.log(`URLs to test: ${urls.length}`);
  console.log(`Concurrent requests: ${concurrency}`);
  console.log(`Requests per URL: ${requestsPerUrl}`);
  if (duration) {
    console.log(`Duration: ${duration} seconds`);
  }
  console.log("========================\n");

  const results: LoadTestResult[] = [];
  const testStartTime = Date.now();
  let requestsMade = 0;

  // Create request queue
  const requestQueue: Array<{ url: string; index: number }> = [];
  for (let i = 0; i < requestsPerUrl; i++) {
    urls.forEach((url) => {
      requestQueue.push({ url, index: i });
    });
  }

  // Function to process requests with concurrency limit
  const processQueue = async () => {
    const activeRequests: Promise<void>[] = [];

    for (const item of requestQueue) {
      // Check if duration has been exceeded
      if (duration && (Date.now() - testStartTime) / 1000 >= duration) {
        console.log("\nDuration limit reached, stopping load test...");
        break;
      }

      // Wait if we've reached concurrency limit
      if (activeRequests.length >= concurrency) {
        await Promise.race(activeRequests);
      }

      // Create request promise
      const requestPromise = (async () => {
        try {
          const result = await loadTestUrl(item.url);
          results.push(result);
          requestsMade++;

          const status = result.success ? "✓" : "✗";
          const statusCode = result.statusCode ? `[${result.statusCode}]` : "[ERR]";
          console.log(
            `${status} ${statusCode} ${result.responseTime}ms - ${item.url} (${requestsMade}/${requestQueue.length})`,
          );
        } catch (error) {
          console.error(`Error testing ${item.url}:`, error);
        }
      })();

      activeRequests.push(requestPromise);

      // Remove completed promises
      requestPromise.finally(() => {
        const index = activeRequests.indexOf(requestPromise);
        if (index > -1) {
          activeRequests.splice(index, 1);
        }
      });
    }

    // Wait for remaining requests to complete
    await Promise.all(activeRequests);
  };

  await processQueue();

  const testEndTime = Date.now();
  const testDuration = (testEndTime - testStartTime) / 1000;

  // Calculate summary statistics
  const summary = calculateLoadTestSummary(results, testDuration);

  return { results, summary };
}

// Calculate summary statistics from load test results
function calculateLoadTestSummary(results: LoadTestResult[], duration: number): LoadTestSummary {
  const responseTimes = results.map((r) => r.responseTime);
  const successfulResults = results.filter((r) => r.success);
  const failedResults = results.filter((r) => !r.success);

  const statusCodeDistribution: Record<number, number> = {};
  results.forEach((r) => {
    if (r.statusCode) {
      statusCodeDistribution[r.statusCode] = (statusCodeDistribution[r.statusCode] || 0) + 1;
    }
  });

  const errors: Record<string, number> = {};
  failedResults.forEach((r) => {
    if (r.error) {
      errors[r.error] = (errors[r.error] || 0) + 1;
    }
  });

  return {
    totalRequests: results.length,
    successfulRequests: successfulResults.length,
    failedRequests: failedResults.length,
    averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
    minResponseTime: Math.min(...responseTimes) || 0,
    maxResponseTime: Math.max(...responseTimes) || 0,
    requestsPerSecond: results.length / duration || 0,
    duration,
    statusCodeDistribution,
    errors,
  };
}

// Print load test summary
export function printLoadTestSummary(summary: LoadTestSummary) {
  console.log("\n=== Load Test Summary ===");
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(
    `Successful: ${summary.successfulRequests} (${((summary.successfulRequests / summary.totalRequests) * 100).toFixed(2)}%)`,
  );
  console.log(
    `Failed: ${summary.failedRequests} (${((summary.failedRequests / summary.totalRequests) * 100).toFixed(2)}%)`,
  );
  console.log(`\nResponse Times:`);
  console.log(`  Average: ${summary.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Min: ${summary.minResponseTime}ms`);
  console.log(`  Max: ${summary.maxResponseTime}ms`);
  console.log(`\nThroughput:`);
  console.log(`  Requests/sec: ${summary.requestsPerSecond.toFixed(2)}`);
  console.log(`  Duration: ${summary.duration.toFixed(2)}s`);

  console.log(`\nStatus Code Distribution:`);
  Object.entries(summary.statusCodeDistribution)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });

  if (Object.keys(summary.errors).length > 0) {
    console.log(`\nErrors:`);
    Object.entries(summary.errors).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });
  }
  console.log("========================\n");
}
