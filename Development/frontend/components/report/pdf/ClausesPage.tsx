import { Text, View } from "@react-pdf/renderer";
import type { Clause } from "@/lib/notice-types";
import { Badge, P, Pill, isFlagged } from "./parts";
import { C, TONE, s } from "./theme";
import Section from "./Section";

export default function ClausesPage({ reportId, leaseName, clauses }: { reportId: string; leaseName: string; clauses: Clause[] }) {
    return (
        <Section name="Every clause" reportId={reportId} leaseName={leaseName}>
            <Text style={[s.h2, s.first]}>Every clause in your lease</Text>
            <P style={s.intro}>All {clauses.length} clauses in the order they appear. Filled numbers are the issues explained in the next section.</P>
            <View style={s.table}>
                <View style={s.th} fixed>
                    <P style={s.cNo}>No.</P>
                    <P style={s.cClause}>Clause and what it means</P>
                    <P style={s.cRating}>Rating</P>
                    <P style={s.cPage}>Page</P>
                </View>
                {clauses.map((c, i) => (
                    <View key={c.id} style={[s.tr, i === clauses.length - 1 ? { borderBottomWidth: 0 } : {}, isFlagged(c) ? { backgroundColor: TONE[c.status].bg } : {}]} wrap={false}>
                        <View style={s.cNo}>
                            <Pill clause={c} />
                        </View>
                        <View style={s.cClause}>
                            <P style={s.bold}>{c.title}</P>
                            <P style={{ color: C.mute, fontSize: 9, lineHeight: "12.5pt" }}>{c.explanation}</P>
                        </View>
                        <View style={s.cRating}>
                            <Badge status={c.status} />
                        </View>
                        <P style={[s.cPage, { color: C.mute }]}>{c.page}</P>
                    </View>
                ))}
            </View>
        </Section>
    );
}