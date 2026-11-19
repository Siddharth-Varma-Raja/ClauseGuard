import { Text, View } from "@react-pdf/renderer";
import type { ActionList } from "@/lib/notice-types";
import { actionGroups, clauseNumber } from "@/lib/actionList";
import { P } from "./parts";
import { C, s } from "./theme";
import Section from "./Section";

export default function ActionListPage({ reportId, actionList }: { reportId: string; actionList: ActionList }) {
    const groups = actionGroups(actionList);

    return (
        <Section name="Action list" reportId={reportId}>
            <View>
                <Text style={[s.h2, s.first]}>Your action list</Text>
                <P style={s.intro}>Built from your lease using fixed rules. No AI reads your lease for this.</P>
            </View>
            {groups.length === 0 && <P style={s.note}>We couldn&apos;t find any actions in this lease.</P>}
            {groups.map((group) => (
                <View key={group.key} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }} minPresenceAhead={40}>
                        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: C.brandDark }}>{group.label}</Text>
                        <Text style={{ fontSize: 8.5, color: C.mute }}>
                            {group.items.length} {group.items.length === 1 ? "item" : "items"}
                        </Text>
                    </View>
                    <View style={s.table}>
                        <View style={s.th}>
                            <Text style={s.cClause}>What your lease says</Text>
                            <Text style={{ width: 52, textAlign: "right" }}>Clause</Text>
                        </View>
                        {group.items.map((item, i) => (
                            <View key={`${clauseNumber(item.clause)}-${i}`} style={s.tr} wrap={false}>
                                <P style={s.cClause}>{item.quote}</P>
                                <Text style={{ width: 52, textAlign: "right", fontFamily: "Helvetica-Bold", color: C.brand }}>{clauseNumber(item.clause)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </Section>
    );
}
