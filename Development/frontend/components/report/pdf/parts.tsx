import { Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { Clause, Status } from "@/lib/notice-types";
import { LABEL } from "../shared";
import { C, TONE, s } from "./theme";

export type PdfStyle = Parameters<typeof StyleSheet.create>[0][string];

export function P({ style, children }: { style?: PdfStyle | PdfStyle[]; children: ReactNode }) {
    return <Text style={[s.body, ...(Array.isArray(style) ? style : style ? [style] : [])]}>{children}</Text>;
}

export function money(cents: number | null) {
    return cents == null ? null : new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}

export function longDate(iso: string) {
    return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
}

export function dateTime(date: Date) {
    return date.toLocaleString("en-IE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function isFlagged(c: Clause) {
    return c.status === "red" || c.status === "amber";
}

export function Logo() {
    return (
        <Svg viewBox="0 0 108 120" width={15} height={17}>
            <Path fill={C.brand} d="M28 0H108V10H32.14L10 32.14V110H108V120H0V28Z" />
            <Path fill={C.brand} d="M35.04 17H108V27H39.18L27 39.18V93H98V70H80V60H108V103H17V35.04Z" />
            <Path fill={C.brand} d="M38 38H72V86H38Z M44 45H66V48.5H44Z M44 52H66V55.5H44Z M44 59H58V62.5H44Z" />
        </Svg>
    );
}

export function Badge({ status }: { status: Status }) {
    return <Text style={[s.badge, { color: TONE[status].ink, backgroundColor: TONE[status].bg, borderColor: TONE[status].line }]}>{LABEL[status]}</Text>;
}

export function Pill({ clause }: { clause: Clause }) {
    const tone = TONE[clause.status];
    const filled = isFlagged(clause);
    return (
        <View style={[s.pill, filled ? { backgroundColor: tone.solid } : { borderWidth: 1, borderColor: tone.solid }]}>
            <Text style={[s.pillText, { color: filled ? "white" : tone.ink }]}>{clause.number}</Text>
        </View>
    );
}