import { Text, View } from "@react-pdf/renderer";
import type { Clause, StatusCounts } from "@/lib/notice-types";
import { plural, verdictOf } from "../shared";
import { P } from "./parts";
import { C, s } from "./theme";
import Section from "./Section";

export default function NextStepsPage({ reportId, leaseName, clauses, counts, issues }: { reportId: string; leaseName: string; clauses: Clause[]; counts: StatusCounts; issues: number }) {
    const { verdict, reason } = verdictOf(counts, clauses.length);
    const serious = clauses.filter((c) => c.status === "red");
    const steps = [
        ["Check the issues", issues > 0 ? `Read the ${issues} ${plural(issues, "issue", "issues")} in this report, or open them in Lease viewer in ClauseGuard.` : "There is nothing to raise with your landlord."],
        ["Email your landlord", "Ask for the changes in writing. ClauseGuard can write the email for you to check and send."],
        ["If you're unsure, get free advice", "Threshold (threshold.ie) and the Residential Tenancies Board (rtb.ie) help renters for free."],
    ];

    return (
        <Section name="Next steps" reportId={reportId} leaseName={leaseName}>
            <View wrap={false}>
                <Text style={[s.h2, s.first]}>What to do next</Text>
                <P style={s.intro}>Follow these in order.</P>
                {steps.map(([title, text], i) => (
                    <View key={title} style={s.step}>
                        <View style={s.stepNo}>
                            <Text style={s.stepNoText}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <P style={s.bold}>{title}</P>
                            <P style={{ color: C.mute }}>{text}</P>
                        </View>
                    </View>
                ))}
            </View>

            <View wrap={false}>
                <Text style={s.h2}>Conclusion</Text>
                <View style={s.conclusion}>
                    <P>
                        {verdict} {reason}
                    </P>
                    {serious.length > 0 && (
                        <P>
                            The {plural(serious.length, "clause", "clauses")} to fix before you sign: {serious.map((c) => `${c.title} (clause ${c.number})`).join(", ")}.
                        </P>
                    )}
                    {counts.amber > 0 && (
                        <P>
                            {counts.amber} {plural(counts.amber, "clause is", "clauses are")} worth asking about but {plural(counts.amber, "is", "are")} allowed. The other {counts.green + counts.grey} clauses are fair or standard wording.
                        </P>
                    )}
                    <P>When your landlord sends a new version, upload it to ClauseGuard to see what changed.</P>
                </View>
            </View>
        </Section>
    );
}