import { Page, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { Logo } from "./parts";
import { s } from "./theme";

export default function Section({ name, reportId, leaseName, children }: { name: string; reportId: string; leaseName: string; children: ReactNode }) {
    return (
        <Page size="A4" style={s.page}>
            <View style={s.header} fixed>
                <View style={s.brand}>
                    <Logo />
                    <Text style={s.brandName}>ClauseGuard</Text>
                </View>
                <Text style={s.headerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} - ${name}`} />
                <Text style={s.headerText}>Report {reportId}</Text>
            </View>
            <View style={s.footer} fixed>
                <Text>Not legal advice. ClauseGuard gives automated, informational analysis.</Text>
                <Text>{leaseName}</Text>
            </View>
            {children}
        </Page>
    );
}