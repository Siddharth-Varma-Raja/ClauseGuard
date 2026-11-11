import { Text, View } from "@react-pdf/renderer";
import type { StatusCounts } from "@/lib/notice-types";
import { STATUS_ORDER } from "@/lib/notice-status";
import { BRIGHT, LABEL, MEANING, verdictOf } from "../shared";
import { P } from "./parts";
import { C, TONE, s } from "./theme";
import Section from "./Section";

export default function OverviewPage({ reportId, total, counts, facts }: { reportId: string; total: number; counts: StatusCounts; facts: [string, string | null, string?][] }) {
    const { level, verdict, reason } = verdictOf(counts, total);
    const missing = facts.filter((f) => !f[1]).map((f) => f[0].toLowerCase());

    return (
        <Section name="Overview" reportId={reportId}>
            <Text style={[s.h2, s.first]}>Overview</Text>
            <View style={s.verdict} wrap={false}>
                <View style={s.lights}>
                    {(["red", "amber", "green"] as const).map((l) => (
                        <View key={l} style={[s.light, { backgroundColor: BRIGHT[l], opacity: l === level ? 1 : 0.2 }]} />
                    ))}
                </View>
                <View style={{ flex: 1 }}>
                    <P style={{ fontSize: 9, color: "#cfe1e2" }}>Should you sign this lease?</P>
                    <Text style={{ fontFamily: "Times-Bold", fontSize: 20, lineHeight: "24pt", color: BRIGHT[level], marginTop: 2 }}>{verdict}</Text>
                    <P style={{ color: "white", marginTop: 4 }}>{reason}</P>
                </View>
            </View>

            <Text style={s.h2} minPresenceAhead={90}>
                What we found in {total} clauses
            </Text>
            <View style={s.tiles} wrap={false}>
                {STATUS_ORDER.map((st) => (
                    <View key={st} style={[s.tile, { backgroundColor: TONE[st].bg, borderColor: TONE[st].line }]}>
                        <Text style={[s.tileCount, { color: TONE[st].ink }]}>{counts[st]}</Text>
                        <P style={[s.tileLabel, { color: TONE[st].ink }]}>{LABEL[st]}</P>
                        <P style={s.tileText}>{MEANING[st]}</P>
                    </View>
                ))}
            </View>

            <Text style={s.h2} minPresenceAhead={90}>
                Key facts
            </Text>
            <View style={s.facts} wrap={false}>
                {facts.map(([label, value, warn], i) => (
                    <View key={label} style={[s.factRow, i === facts.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                        <P style={s.factLabel}>{label}</P>
                        <View style={{ flex: 1 }}>
                            <P style={value ? s.factValue : { color: C.mute, fontFamily: "Helvetica-Oblique" }}>{value ?? "Not written in your lease"}</P>
                            {warn && <P style={{ color: TONE.amber.ink, fontFamily: "Helvetica-Bold", fontSize: 8.5 }}>{warn}</P>}
                        </View>
                    </View>
                ))}
            </View>
            {missing.length > 0 && <P style={s.note}>This lease doesn&apos;t say the {missing.join(", ")}. Ask your landlord to add it before you sign.</P>}
        </Section>
    );
}