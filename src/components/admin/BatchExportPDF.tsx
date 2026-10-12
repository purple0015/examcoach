import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register a monospace font for ID Code and Temp Password
Font.register({
  family: 'Courier',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/courier@1.0.4/Courier.ttf' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
  accentBar: {
    height: 4,
    backgroundColor: '#f97316',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
  },
  orgTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  orgPrefix: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  metadata: {
    textAlign: 'right',
  },
  metaText: {
    fontSize: 8,
    color: '#94a3b8',
    marginBottom: 2,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowOdd: {
    backgroundColor: '#f8fafc',
  },
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#fff7ed',
    padding: 8,
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 8,
    justifyContent: 'center',
  },
  tableCellHeader: {
    fontWeight: 'bold',
    color: '#7c2d12',
    fontSize: 9,
  },
  tableCell: {
    fontSize: 9,
  },
  monospace: {
    fontFamily: 'Courier',
    fontSize: 8,
  },
  badgeTrial: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '2 6',
    borderRadius: 10,
    fontSize: 7,
    textTransform: 'uppercase',
  },
  badgePaid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '2 6',
    borderRadius: 10,
    fontSize: 7,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  copyright: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  confidential: {
    fontSize: 8,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  pageNumber: {
    fontSize: 8,
    color: '#94a3b8',
  },
});

interface OrgID {
  id: string;
  code: string;
  tempPassword: string;
  isClaimed: boolean;
  status: string;
  trialEndsAt: string | null;
  createdAt: string;
}

interface BatchExportPDFProps {
  orgName: string;
  orgPrefix: string;
  ids: OrgID[];
}

export const BatchExportPDF = ({ orgName, orgPrefix, ids }: BatchExportPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.accentBar} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.orgTitle}>{orgName}</Text>
          <Text style={styles.orgPrefix}>Prefix: {orgPrefix}</Text>
        </View>
        <View style={styles.metadata}>
          <Text style={styles.metaText}>Generated on: {new Date().toLocaleDateString()}</Text>
          <Text style={styles.metaText}>Total Student IDs: {ids.length}</Text>
          <Text style={styles.metaText}>ExamCoach Administrative Document</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>ID Code</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Temp Password</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Status</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Claimed</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Trial Ends</Text></View>
        </View>

        {ids.map((id, index) => (
          <View key={id.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowOdd : {}]}>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, styles.monospace]}>{id.code}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, styles.monospace]}>{id.tempPassword}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={id.status === 'paid' ? styles.badgePaid : styles.badgeTrial}>
                {id.status}
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{id.isClaimed ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {id.trialEndsAt ? new Date(id.trialEndsAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer} fixed>
        <Text style={styles.copyright}>© 2026 Axiom Neural Systems by Silethemba. All rights reserved.</Text>
        <View style={styles.footerBottom}>
          <Text style={styles.confidential}>Confidential - For internal school distribution only.</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </View>
    </Page>
  </Document>
);
