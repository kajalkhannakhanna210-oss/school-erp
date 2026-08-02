import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReportResult } from "@/lib/reports";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#666666", marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
    paddingBottom: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
    paddingVertical: 3,
  },
  cell: { flex: 1, paddingRight: 6 },
  headerCell: { flex: 1, fontWeight: 700, paddingRight: 6 },
  right: { textAlign: "right" },
  empty: { marginTop: 12, color: "#888888" },
});

function ReportDocument({
  result,
  generatedAt,
}: {
  result: ReportResult;
  generatedAt: string;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{result.title}</Text>

        <Text style={styles.subtitle}>
          Generated {generatedAt}
        </Text>

        <View style={styles.headerRow}>
          {result.columns.map((c) => (
            <Text
              key={c.key}
              style={[
                styles.headerCell,
                ...(c.align === "right" ? [styles.right] : []),
              ]}
            >
              {c.label}
            </Text>
          ))}
        </View>

        {result.rows.map((row, i) => (
          <View key={i} style={styles.row}>
            {result.columns.map((c) => (
              <Text
                key={c.key}
                style={[
                  styles.cell,
                  ...(c.align === "right" ? [styles.right] : []),
                ]}
              >
                {String(row[c.key] ?? "")}
              </Text>
            ))}
          </View>
        ))}

        {result.rows.length === 0 && (
          <Text style={styles.empty}>
            No data for the selected filters.
          </Text>
        )}
      </Page>
    </Document>
  );
}

export async function renderReportPdf(result: ReportResult) {
  const generatedAt = new Date().toLocaleString();

  return renderToBuffer(
    <ReportDocument
      result={result}
      generatedAt={generatedAt}
    />
  );
}