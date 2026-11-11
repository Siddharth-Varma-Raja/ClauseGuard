import { Page, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { Logo } from "./parts";
import { s } from "./theme";

export default function Section({ name, reportId, children }: { name: string; reportId: string; children: ReactNode }) {
    return (
        <Page size="A4" style={s.page}>
            <View style={s.header} fixed>
                <View style={s.brand}>
                    <Logo />
                    <Text style={s.brandName}>ClauseGuard</Text>
                </View>
                <Text style={s.headerText}>{name}</Text>
                <Text style={s.headerText}>Report {reportId}</Text>
            </View>
            <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            {children}
        </Page>
    );
}