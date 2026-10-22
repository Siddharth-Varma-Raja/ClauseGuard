import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Status } from "./notice-types";

export const STATUS = {
  red: {
    label: "Likely unfair",
    whyTitle: "Why ClauseGuard flagged this",
    risk: "High",
    hint: "This clause may be unfair or unlawful.",
    Icon: CircleAlert,
    text: "text-bad",
    soft: "bg-bad-bg",
    border: "border-bad-solid",
    solid: "bg-bad-solid",
    mark: "bg-bad-solid/15",
    hover: "hover:bg-bad-bg",
  },
  amber: {
    label: "Worth checking",
    whyTitle: "Why ClauseGuard flagged this",
    risk: "Medium",
    hint: "This clause needs further checking.",
    Icon: TriangleAlert,
    text: "text-warn",
    soft: "bg-warn-bg",
    border: "border-warn-solid",
    solid: "bg-warn-solid",
    mark: "bg-warn-solid/25",
    hover: "hover:bg-warn-bg",
  },
  green: {
    label: "Looks fine",
    whyTitle: "Why ClauseGuard flagged this",
    risk: "Low",
    hint: "No obvious issue was identified.",
    Icon: CircleCheck,
    text: "text-ok",
    soft: "bg-ok-bg",
    border: "border-ok-solid",
    solid: "bg-ok-solid",
    mark: "",
    hover: "hover:bg-ok-bg",
  },
  grey: {
    label: "Informational",
    whyTitle: "Why ClauseGuard flagged this",
    risk: "Not assessed",
    hint: "This clause provides additional information.",
    Icon: Info,
    text: "text-neu",
    soft: "bg-neu-bg",
    solid: "bg-neu-solid",
    mark: "",
    hover: "hover:bg-neu-bg",
  },
} as const;

export const STATUS_ORDER: Status[] = ["red", "amber", "green", "grey"];