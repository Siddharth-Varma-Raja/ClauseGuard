import { Text, View } from "@react-pdf/renderer";
import { plural } from "../shared";
import { P } from "./parts";
import { s } from "./theme";
import Section from "./Section";

export default function CoverPage({
    reportId,
    leaseName,
    userName,
    fileName,
    pageCount,
    total,
    issues,
    details,
    contents,
}: {
    reportId: string;
    leaseName: string;
    userName: string;
    fileName: string;
    pageCount: number;
    total: number;
    issues: number;
    details: [string, string][];
    contents: { id: string; label: string }[];
}) {
    return (
        <Section name="Cover page" reportId={reportId} leaseName={leaseName}>
            <Text style={s.coverName}>{userName}</Text>
            <Text style={s.coverLease}>{fileName}</Text>
            <View style={s.coverMeta}>
                <Text>Lease report by ClauseGuard</Text>
                <Text>Checked against the Residential Tenancies Acts 2004 to 2022</Text>
            </View>
            <View style={s.rule} />

            <Text style={[s.h2, { marginTop: 18 }]}>Report details</Text>
            <View style={s.details}>
                <View style={s.detailCol}>
                    {details.map(([label, value]) => (
                        <View key={label}>
                            <Text style={s.detailLabel}>{label}</Text>
                            <P style={s.detailValue}>{value}</P>
                        </View>
                    ))}
                </View>
                <View style={s.sizeBox}>
                    <Text style={s.bold}>
                        {pageCount} {plural(pageCount, "page", "pages")}
                    </Text>
                    <Text style={s.bold}>{total} clauses</Text>
                    <Text style={s.bold}>
                        {issues} {plural(issues, "issue", "issues")} to raise
                    </Text>
                </View>
            </View>

            <Text style={[s.h2, { marginTop: 26 }]}>In this report</Text>
            <View style={s.contents}>
                {contents.map((c, i) => (
                    <View key={c.id} style={s.contentsRow}>
                        <Text style={s.contentsNo}>{i + 1}</Text>
                        <Text>{c.label}</Text>
                    </View>
                ))}
            </View>

            <P style={s.disclaimer}>Not legal advice. ClauseGuard gives automated, informational analysis. For advice about your situation, contact Threshold or the Residential Tenancies Board.</P>
        </Section>
    );
}