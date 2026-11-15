import { Text, View } from "@react-pdf/renderer";
import { plural } from "../shared";
import { P } from "./parts";
import { C, s } from "./theme";
import Section from "./Section";

export default function NextStepsPage({ reportId, issues }: { reportId: string; issues: number }) {
    const steps = [
        ["Check the potential clauses", issues > 0 ? `Read the ${issues} potential ${plural(issues, "clause", "clauses")} in this report, or open them in Lease viewer in ClauseGuard.` : "There is nothing to raise with your landlord."],
        ["Email your landlord", "Ask for the changes in writing. ClauseGuard can write the email for you to check and send."],
        ["If you're unsure, get free advice", "Threshold (threshold.ie) and the Residential Tenancies Board (rtb.ie) help renters for free."],
    ];

    return (
        <Section name="Next steps" reportId={reportId}>
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
        </Section>
    );
}