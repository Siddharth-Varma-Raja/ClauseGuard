import { Text, View } from "@react-pdf/renderer";
import type { Clause } from "@/lib/notice-types";
import { readableReason } from "@/lib/reason";
import { heading, plural } from "../shared";
import { Badge, P } from "./parts";
import { C, TONE, s } from "./theme";
import Section from "./Section";

function IssueCard({ clause }: { clause: Clause }) {
    const tone = TONE[clause.status];
    const why = readableReason(clause.reason);
    return (
        <View style={[s.card, { borderColor: tone.line }]} wrap={false}>
            <View style={[s.cardHead, { backgroundColor: tone.bg, borderBottomColor: tone.line }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Badge status={clause.status} />
                    <P style={{ fontSize: 8.5, color: C.mute }}>Lease page {clause.page}</P>
                </View>
                <Text style={s.cardTitle}>{heading(clause)}</Text>
                <P style={{ marginTop: 3 }}>{clause.explanation}</P>
            </View>
            <View style={s.cardBody}>
                {why ? (
                    <View>
                        <P style={s.label}>Why it matters</P>
                        <P>{why}</P>
                    </View>
                ) : null}
                {clause.nextSteps.length > 0 && (
                    <View>
                        <P style={s.label}>What to ask your landlord</P>
                        {clause.nextSteps.map((step) => (
                            <P key={step}>• {step}</P>
                        ))}
                    </View>
                )}
                <View>
                    <P style={s.label}>The exact wording in your lease</P>
                    <P style={[s.quote, { borderLeftColor: tone.solid }]}>“{clause.text}”</P>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    {clause.sources.length > 0 && <P style={{ fontSize: 8.5, color: C.mute }}>Based on {clause.sources.map((x) => x.title).join(", ")}</P>}
                </View>
            </View>
        </View>
    );
}

export default function IssuesPage({ reportId, flagged }: { reportId: string; flagged: Clause[] }) {
    return (
        <Section name="Potential clauses" reportId={reportId}>
            <View>
                <Text style={[s.h2, s.first]}>Potential clauses found</Text>
                <P style={s.intro}>
                    {flagged.length} {plural(flagged.length, "clause", "clauses")}, High Risk first.
                </P>
            </View>
            {flagged.map((c) => (
                <IssueCard key={c.id} clause={c} />
            ))}
        </Section>
    );
}