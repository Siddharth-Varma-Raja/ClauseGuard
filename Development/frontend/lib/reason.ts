export function readableReason(reason: string | null | undefined) {
    if (!reason) return "";
    return /^Rule [A-Z]+-\d+|Topic guessed by|keyword-baseline/.test(reason) ? "" : reason;
}