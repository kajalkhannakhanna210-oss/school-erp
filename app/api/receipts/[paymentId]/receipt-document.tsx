import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

// Phase 10 (System Settings) is where school name/logo become configurable;
// hardcoded here until that exists.
const SCHOOL_NAME = "Your School Name";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 700,
  },
  metaBlock: {
    textAlign: "right",
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    color: "#555555",
  },
  table: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: 700,
  },
  footer: {
    marginTop: 24,
  },
});

export type ReceiptPayment = {
  receipt_number: string | null;
  amount: number;
  paid_at: string | null;
  razorpay_payment_id: string | null;
  fee_heads: { name: string } | null;
  students: {
    admission_number: string;
    profiles: { full_name: string } | null;
    classes: { name: string } | null;
    sections: { name: string } | null;
  } | null;
};

function ReceiptDocument({ payment }: { payment: ReceiptPayment }) {
  const paidDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleDateString()
    : "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{SCHOOL_NAME}</Text>

          <View style={styles.metaBlock}>
            <Text>Receipt No: {payment.receipt_number}</Text>
            <Text>Date: {paidDate}</Text>
          </View>
        </View>

        <Text style={styles.title}>Fee Payment Receipt</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Student Name</Text>
          <Text>{payment.students?.profiles?.full_name}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Admission Number</Text>
          <Text>{payment.students?.admission_number}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Class</Text>
          <Text>
            {payment.students?.classes?.name} - {payment.students?.sections?.name}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text>{payment.fee_heads?.name}</Text>
            <Text>Rs. {payment.amount.toFixed(2)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalLabel}>
              Rs. {payment.amount.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.label}>
            Payment Mode: Online (Razorpay)
          </Text>

          {payment.razorpay_payment_id && (
            <Text style={styles.label}>
              Transaction ID: {payment.razorpay_payment_id}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(
  payment: ReceiptPayment
): Promise<ArrayBuffer> {
  const buffer = await renderToBuffer(
    <ReceiptDocument payment={payment} />
  );

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}