import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  DataTable,
  List,
  Spinner,
  DatePicker,
  Button
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useState, useCallback } from "react";

/* 🧠 Loader to fetch data from Lambda API */
export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const BASE_URL = "https://virtual-plant-assistant-dev-lpxeh.ondigitalocean.app/api";

    console.log("🚀 ~ AppHome ~ dateRange:", (new Date()).getMonth())

    const from = url.searchParams.get("from") || "2025-10-01";
    const to = url.searchParams.get("to") || "2025-10-11";

    // Popular Questions
    const popularQuestionsApiUrl = `${BASE_URL}/assistant/metrics?metric_type=popular_questions&from=${from}&to=${to}`;
    const popularQuestionsRes = await fetch(popularQuestionsApiUrl);
    if (!popularQuestionsRes.ok) throw new Error(`API Error: ${popularQuestionsRes.status}`);
    const popularQuestionsData = await popularQuestionsRes.json();
    console.log("🚀 ~ loader ~ popularQuestionsData:", popularQuestionsData)
    const finalPopularQuestionsData = popularQuestionsData.filter((item: any) => typeof item.question === "string" && item.question.trim() !== "");

    // Top Products
    const topProductsApiUrl = `${BASE_URL}/assistant/metrics?metric_type=top_products&from=${from}&to=${to}`;
    console.log("🚀 ~ loader ~ topProductsApiUrl:", topProductsApiUrl)
    const topProductsRes = await fetch(topProductsApiUrl);
    if (!topProductsRes.ok) throw new Error(`API Error: ${topProductsRes.status}`);
    const topProductsData = await topProductsRes.json();
    console.log("🚀 ~ loader ~ topProductsData:", topProductsData)
    const finalTopProductsData = topProductsData.map((p: any) => [
      p.product_name ?? "Unknown Product",
      `$${(p.revenue ?? 0).toFixed(2)}`,     // revenue placeholder
      p.add_to_cart.toString(),
      `${p.conversion_rate}%`
    ]);

    // Overview
    const overviewApiUrl = `${BASE_URL}/assistant/metrics?metric_type=overview&from=${from}&to=${to}`;
    const overviewRes = await fetch(overviewApiUrl);
    if (!overviewRes.ok) throw new Error(`API Error: ${overviewRes.status}`);
    const overviewData = await overviewRes.json();
    console.log("🚀 ~ loader ~ overviewData:", overviewData)

    const engagementMetricsApiUrl = `${BASE_URL}/assistant/metrics?metric_type=engagement&from=${from}&to=${to}`;
    const engagementMetricsRes = await fetch(engagementMetricsApiUrl);
    if (!engagementMetricsRes.ok) throw new Error(`API Error: ${engagementMetricsRes.status}`);
    const engagementMetricsData = await engagementMetricsRes.json();
    console.log("🚀 ~ loader ~ engagementMetricsData:", engagementMetricsData)

    return json({ popularQuestions: finalPopularQuestionsData, topProducts: finalTopProductsData, overview: overviewData, engagement: engagementMetricsData });
  } catch (err) {
    console.error("❌ Failed to load data:", err);
    return json({ popularQuestions: [], topProducts: [], overview: {}, engagement: {} });
  }
};

export default function AppHome() {
  const { popularQuestions, topProducts, overview, engagement } = useLoaderData<typeof loader>();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialFrom = searchParams.get("from") || "2025-10-01";
  const initialTo = searchParams.get("to") || "2025-10-11";
  const [{ month, year }, setDate] = useState({ month: (new Date()).getMonth(), year: (new Date()).getFullYear() });
  const [dateRange, setDateRange] = useState({
    start: new Date(initialFrom),
    end: new Date(initialTo)
  });



  const handleDateChange = useCallback(
    (value) => {
      const startDate = `${new Date(value.start).getFullYear()}-${new Date(value.start).getMonth() + 1}-${new Date(value.start).getDate()}`;
      const endDate = `${new Date(value.end).getFullYear()}-${new Date(value.end).getMonth() + 1}-${new Date(value.end).getDate()}`;
      setDateRange({ start: new Date(startDate), end: new Date(endDate) });
    },
    []
  );

  const applyDates = () => {
    setSearchParams({
      from: dateRange.start.toISOString().slice(0, 10),
      to: dateRange.end.toISOString().slice(0, 10)
    });
  };

  const handleMonthChange = useCallback(
    (month: number, year: number) => setDate({ month, year }),
    [],
  );


  function getTone(delta) {
    if (!delta) return "warning"; // fallback

    const num = parseFloat(delta.replace("%", ""));

    if (num > 0) return "success";
    if (num < 0) return "critical";
    return "warning";
  }
  return (
    <Page>
      <TitleBar title="Assistant Analytics Dashboard" />

      <BlockStack gap="600">
        <Layout>
          <Layout.Section>
            <Card>

              <Text variant="headingMd">Select Date Range</Text>

              <DatePicker
                month={month}
                year={year}
                onChange={handleDateChange}
                selected={dateRange}
                allowRange
                onMonthChange={handleMonthChange}
              />

              <InlineStack gap="300">
                <Button onClick={applyDates} primary>
                  Apply
                </Button>
              </InlineStack>
            </Card>
          </Layout.Section>


        </Layout>

        {/* 🟢 Overview Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Overview
                </Text>
                <InlineStack align="space-between" gap="400" wrap={false}>
                  {
                    overview && (
                      <>
                        <Metric title="Total Revenue" value={`$${overview.total_revenue?.toFixed(2)}` || "$0"} tone={getTone(`${overview.total_revenue_delta_percent}%`)} delta={`${overview.total_revenue_delta_percent}%` || "0%"} />
                        <Metric title="Conversion Rate" value={`${overview.conversion_rate}%` || "0%"} tone={getTone(`${overview.conversion_rate_delta_percent}%`)} delta={`${overview.conversion_rate_delta_percent}%` || "0%"} />
                        <Metric title="AOV" value={`$${overview.aov}` || "$0"} tone={getTone(`${overview.aov_delta_percent}%`)} delta={`${overview.aov_delta_percent}%` || "0%"} />
                        {/* <Metric title="Total Messages" value={`${overview.totalMessages}` || "$0"} tone="critical" delta={overview.totalMessages_delta || "0%"} />
                        <Metric title="Assistant Messages" value={`${overview.assistantMessages}` || "$0"} tone="critical" delta={overview.assistantMessages_delta || "0%"} /> */}
                      </>
                    )
                  }
                  {/* <Metric title="Total Revenue" value="$12,540" tone="success" delta="+14%" />
                  <Metric title="Conversion Rate" value="3.2%" tone="warning" delta="0%" />
                  <Metric title="AOV" value="$45.70" tone="critical" delta="-3%" /> */}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 🪴 Product Performance Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Top Products
                </Text>
                <DataTable
                  columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                  headings={["Product", "Revenue", "Add to Cart", "Conversion Rate"]}
                  rows={topProducts}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 💬 Engagement Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Engagement Metrics
                </Text>
                <InlineStack align="space-between" gap="400" wrap={false}>
                  <Metric title="Orders" value={engagement.orders || "0"} tone={getTone(`${engagement.orders_delta_percent}%`)} delta={`${engagement.orders_delta_percent}%` || "0%"} />
                  <Metric title="Assistant Starts" value={engagement.assistant_starts || "0"} tone={getTone(`${engagement.assistant_starts_delta_percent}%`)} delta={`${engagement.assistant_starts_delta_percent}%` || "0%"} />
                  <Metric title="Checkout Clicks" value={engagement.checkout_clicks || "0"} tone={getTone(`${engagement.checkout_clicks_delta_percent}%`)} delta={`${engagement.checkout_clicks_delta_percent}%` || "0%"} />
                  <Metric title="Add to Cart Clicks" value={engagement.add_to_cart_clicks || "0"} tone={getTone(`${engagement.add_to_cart_clicks_delta_percent}%`)} delta={`${engagement.add_to_cart_clicks_delta_percent}%` || "0%"} />
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 🌱 Popular Questions Section (from Lambda API) */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Popular Questions
                </Text>
                {popularQuestions?.length ? (
                  <List type="bullet">
                    {popularQuestions.map((item: any, i: number) => (
                      <List.Item key={i}>
                        “{item.question}” — <Text as="span" tone="subdued">{item.count}× asked</Text>
                      </List.Item>
                    ))}
                  </List>
                ) : (
                  <InlineStack align="center">
                    <Spinner accessibilityLabel="Loading Popular Questions" size="small" />
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page >
  );
}

/* 🧩 Reusable Metric component */
function Metric({
  title,
  value,
  tone,
  delta,
}: {
  title: string;
  value: string;
  tone: "success" | "warning" | "critical";
  delta: string;
}) {
  return (
    <BlockStack gap="200">
      <Text as="h3" variant="headingSm">
        {title}
      </Text>
      <InlineStack align="start" gap="200">
        <Text as="span" variant="bodyMd">
          {value}
        </Text>
        <Badge tone={tone}>{delta}</Badge>
      </InlineStack>
    </BlockStack>
  );
}
