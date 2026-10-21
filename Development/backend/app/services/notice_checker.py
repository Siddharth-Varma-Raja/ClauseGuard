"""
Irish Tenancy Notice Verification Rules Service
=================================================
Evaluates landlord notices according to Irish Residential Tenancies Board (RTB) rules:
- Termination notice requirements (Residential Tenancies Acts 2004–2022)
- Rent review notices (including Rent Pressure Zone / March 2026 rules: 2% / HICP cap, 90-day notice)
- Landlord entry notices (24-hour advance written notice rule under Section 12)
"""

from datetime import datetime, date
from typing import Any


def check_notice_rules(notice_type: str, answers: dict[str, Any]) -> dict[str, Any]:
    """
    Evaluate a notice submission against statutory Irish rental legislation.
    Returns:
        verdict: 'valid' | 'attention' | 'invalid' | 'info'
        summary: str
        checks: list[dict]
        key_dates: list[dict]
        next_steps: list[str]
    """
    if notice_type == "termination":
        return _evaluate_termination_notice(answers)
    elif notice_type == "rent":
        return _evaluate_rent_review_notice(answers)
    elif notice_type == "entry":
        return _evaluate_entry_notice(answers)
    else:
        return _evaluate_generic_notice(answers)


def _evaluate_termination_notice(answers: dict[str, Any]) -> dict[str, Any]:
    checks = []
    has_failure = False
    has_warning = False

    # 1. Written notice requirement
    is_written = bool(answers.get("isWritten", True))
    if is_written:
        checks.append({
            "status": "pass",
            "title": "Written Form",
            "detail": "The notice of termination is served in writing as legally mandated.",
            "source": "Residential Tenancies Act 2004 s. 62(1)(a)"
        })
    else:
        has_failure = True
        checks.append({
            "status": "fail",
            "title": "Notice Must Be in Writing",
            "detail": "An oral or text-message notice is legally void. A valid notice must be in writing and signed.",
            "source": "Residential Tenancies Act 2004 s. 62(1)(a)"
        })

    # 2. Signed by landlord or authorized agent
    is_signed = bool(answers.get("isSigned", True))
    if is_signed:
        checks.append({
            "status": "pass",
            "title": "Signature Present",
            "detail": "The notice contains an authorized signature.",
            "source": "Residential Tenancies Act 2004 s. 62(1)(b)"
        })
    else:
        has_failure = True
        checks.append({
            "status": "fail",
            "title": "Missing Signature",
            "detail": "The notice of termination must be signed by the landlord or an authorized agent.",
            "source": "Residential Tenancies Act 2004 s. 62(1)(b)"
        })

    # 3. Minimum statutory notice period check
    tenancy_duration_months = int(answers.get("durationMonths", 12))
    notice_days_given = int(answers.get("noticeDays", 90))

    if tenancy_duration_months < 6:
        statutory_days = 28
    elif tenancy_duration_months < 12:
        statutory_days = 90
    elif tenancy_duration_months < 36:
        statutory_days = 120
    elif tenancy_duration_months < 84:
        statutory_days = 180
    elif tenancy_duration_months < 96:
        statutory_days = 196
    else:
        statutory_days = 224

    if notice_days_given >= statutory_days:
        checks.append({
            "status": "pass",
            "title": f"Notice Period: {notice_days_given} Days Given",
            "detail": f"Given your tenancy length of {tenancy_duration_months} months, the statutory minimum is {statutory_days} days. Your notice satisfies this.",
            "source": "Residential Tenancies (Amendment) Act 2021 / Section 66"
        })
    else:
        has_failure = True
        checks.append({
            "status": "fail",
            "title": f"Notice Period Insufficient ({notice_days_given} vs {statutory_days} Days Required)",
            "detail": f"For a tenancy of {tenancy_duration_months} months, Irish law strictly requires at least {statutory_days} days notice. An early termination date makes the entire notice invalid.",
            "source": "Residential Tenancies Act 2004 Section 66"
        })

    # 4. Reason and Statutory Declaration (for Part 4 tenancies > 6 months)
    reason = str(answers.get("reason", "sale")).lower()
    has_statutory_declaration = bool(answers.get("hasStatutoryDeclaration", False))

    if tenancy_duration_months >= 6:
        if reason in ["sale", "own_use", "family"]:
            if has_statutory_declaration:
                checks.append({
                    "status": "pass",
                    "title": "Statutory Declaration Included",
                    "detail": "Accompanying statutory declaration signed before a solicitor/peace commissioner is present.",
                    "source": "Residential Tenancies Act 2004 Section 34"
                })
            else:
                has_failure = True
                checks.append({
                    "status": "fail",
                    "title": "Missing Statutory Declaration",
                    "detail": f"When terminating a tenancy under Part 4 protection for '{reason}', a sworn Statutory Declaration MUST accompany the notice.",
                    "source": "Residential Tenancies Act 2004 Section 35"
                })
        else:
            checks.append({
                "status": "info",
                "title": f"Termination Reason: {reason.title()}",
                "detail": f"Ground stated is '{reason}'. Ensure all supporting documentation (e.g. planning permission for refurbishments) is attached.",
                "source": "Residential Tenancies Act 2004 Section 34"
            })

    # 5. RTB copy requirement
    rtb_notified = bool(answers.get("copySentToRtb", True))
    if not rtb_notified:
        has_warning = True
        checks.append({
            "status": "warn",
            "title": "RTB Copy Required",
            "detail": "The landlord must send a copy of the termination notice to the Residential Tenancies Board (RTB) on the same day it is served.",
            "source": "Residential Tenancies (No. 2) Act 2021"
        })

    if has_failure:
        verdict = "invalid"
        summary = "This Notice of Termination fails mandatory legal requirements and appears unenforceable."
    elif has_warning:
        verdict = "attention"
        summary = "This Notice of Termination meets basic requirements but requires attention regarding procedure."
    else:
        verdict = "valid"
        summary = "This Notice of Termination complies with statutory RTB notice period and format criteria."

    key_dates = []
    if "serviceDate" in answers:
        key_dates.append({"label": "Date Notice Served", "date": str(answers["serviceDate"])})
    if "terminationDate" in answers:
        key_dates.append({"label": "Termination Date", "date": str(answers["terminationDate"])})

    next_steps = [
        "If the notice is invalid, do not vacate prematurely. You may lodge a dispute with the RTB within 28 days of receiving it.",
        "Keep the envelope and stamp showing the exact date of service.",
        "Consult with Threshold or the RTB Dispute Resolution service for guidance."
    ]

    return {
        "verdict": verdict,
        "summary": summary,
        "checks": checks,
        "key_dates": key_dates,
        "next_steps": next_steps,
    }


def _evaluate_rent_review_notice(answers: dict[str, Any]) -> dict[str, Any]:
    checks = []
    has_failure = False
    has_warning = False

    # 1. 90-day notice requirement
    notice_days = int(answers.get("noticeDays", 90))
    if notice_days >= 90:
        checks.append({
            "status": "pass",
            "title": f"Advance Notice: {notice_days} Days Given",
            "detail": "Irish law mandates at least 90 days written notice before a rent increase takes effect.",
            "source": "Residential Tenancies Act 2004 s. 22"
        })
    else:
        has_failure = True
        checks.append({
            "status": "fail",
            "title": f"Insufficient Notice ({notice_days} Days vs 90 Days Required)",
            "detail": "The notice provides fewer than 90 days before the new rent begins, making it invalid.",
            "source": "Residential Tenancies Act 2004 s. 22(2)"
        })

    # 2. RPZ Cap (March 2026 Rules: 2% / HICP cap)
    is_rpz = bool(answers.get("inRpz", True))
    current_rent = float(answers.get("currentRent", 1000))
    new_rent = float(answers.get("newRent", 1020))

    if current_rent > 0:
        percentage_increase = ((new_rent - current_rent) / current_rent) * 100.0
    else:
        percentage_increase = 0.0

    if is_rpz:
        # Statutory annual cap under March 2026 rules is min(HICP, 2.0%) per annum
        max_allowed_pct = float(answers.get("maxAllowedPercent", 2.0))
        if percentage_increase <= (max_allowed_pct + 0.01):
            checks.append({
                "status": "pass",
                "title": f"Rent Increase Within RPZ Limit ({percentage_increase:.2f}%)",
                "detail": f"Increase of {percentage_increase:.2f}% is within the statutory Rent Pressure Zone cap of {max_allowed_pct:.1f}% per year.",
                "source": "Residential Tenancies (Amendment) Act (March 2026 Rules)"
            })
        else:
            has_failure = True
            checks.append({
                "status": "fail",
                "title": f"Rent Increase Exceeds RPZ Cap ({percentage_increase:.2f}% vs {max_allowed_pct:.1f}% max)",
                "detail": f"The property is in an RPZ. The requested increase of {percentage_increase:.2f}% exceeds the legal 2% / HICP cap.",
                "source": "Residential Tenancies Act 2004 s. 24B"
            })

    # 3. 12-month interval rule
    months_since_last_review = int(answers.get("monthsSinceLastReview", 12))
    if months_since_last_review >= 12:
        checks.append({
            "status": "pass",
            "title": f"Review Frequency ({months_since_last_review} Months Since Last Review)",
            "detail": "Rent has not been reviewed within the preceding 12 months.",
            "source": "Residential Tenancies Act 2004 s. 20"
        })
    else:
        has_failure = True
        checks.append({
            "status": "fail",
            "title": "Review Too Frequent (Less Than 12 Months)",
            "detail": "Rent cannot be reviewed more often than once every 12 months.",
            "source": "Residential Tenancies Act 2004 s. 20"
        })

    # 4. Comparable properties attached
    has_comparables = bool(answers.get("hasThreeComparables", True))
    if has_comparables:
        checks.append({
            "status": "pass",
            "title": "Three Market Comparables Cited",
            "detail": "The notice provides 3 comparable market rentals of similar size and condition in the local area.",
            "source": "Residential Tenancies Act 2004 s. 22"
        })
    else:
        has_failure = True
        checks.append({
            "status": "fail",
            "title": "Missing 3 Comparable Properties",
            "detail": "A rent review notice MUST cite three comparable dwellings in the locality to be valid.",
            "source": "Residential Tenancies Act 2004 s. 22"
        })

    if has_failure:
        verdict = "invalid"
        summary = "This Rent Review Notice exceeds legal limits or violates mandatory statutory notice procedures."
    elif has_warning:
        verdict = "attention"
        summary = "This Rent Review Notice requires scrutiny of comparable figures."
    else:
        verdict = "valid"
        summary = "This Rent Review Notice complies with Irish 90-day notice and RPZ cap regulations."

    key_dates = []
    if "noticeDate" in answers:
        key_dates.append({"label": "Notice Date", "date": str(answers["noticeDate"])})
    if "effectiveDate" in answers:
        key_dates.append({"label": "Effective Date", "date": str(answers["effectiveDate"])})

    next_steps = [
        "If you believe the rent increase exceeds the RPZ cap or market rent, refer the dispute to the RTB before the new rent date.",
        "You have 28 days from receiving the notice to submit an RTB dispute.",
        "Until the RTB dispute is resolved, continue paying your existing rent."
    ]

    return {
        "verdict": verdict,
        "summary": summary,
        "checks": checks,
        "key_dates": key_dates,
        "next_steps": next_steps,
    }


def _evaluate_entry_notice(answers: dict[str, Any]) -> dict[str, Any]:
    checks = []
    has_failure = False

    hours_notice = int(answers.get("hoursNotice", 24))
    is_emergency = bool(answers.get("isEmergency", False))

    if is_emergency:
        checks.append({
            "status": "info",
            "title": "Emergency Access",
            "detail": "Immediate entry is permitted without notice only for bona fide emergencies (e.g. active gas leak, structural danger, flooding).",
            "source": "Residential Tenancies Act 2004 s. 12"
        })
        verdict = "info"
        summary = "Emergency inspection noted under health & safety guidelines."
    else:
        if hours_notice >= 24:
            checks.append({
                "status": "pass",
                "title": f"Advance Notice: {hours_notice} Hours Given",
                "detail": "Landlord has provided at least 24 hours advance notice for routine inspection / maintenance.",
                "source": "Residential Tenancies Act 2004 s. 12(1)(a)"
            })
            verdict = "valid"
            summary = "Inspection notice adheres to the standard 24-hour advance notification rule."
        else:
            has_failure = True
            checks.append({
                "status": "fail",
                "title": f"Insufficient Notice ({hours_notice} Hours Given)",
                "detail": "Irish law guarantees the tenant's right to peaceful and exclusive occupation. Landlords must give reasonable notice (at least 24 hours in writing) for non-emergency visits.",
                "source": "Residential Tenancies Act 2004 s. 12(1)(a)"
            })
            verdict = "invalid"
            summary = "Landlord entry without 24 hours notice breaches peaceful occupation rights."

    key_dates = []
    if "entryDate" in answers:
        key_dates.append({"label": "Proposed Entry Date/Time", "date": str(answers["entryDate"])})

    next_steps = [
        "You are entitled to propose an alternative reasonable time if the requested time is inconvenient.",
        "A landlord does not have the right to enter your home when you are not present unless explicitly agreed in advance."
    ]

    return {
        "verdict": verdict,
        "summary": summary,
        "checks": checks,
        "key_dates": key_dates,
        "next_steps": next_steps,
    }


def _evaluate_generic_notice(answers: dict[str, Any]) -> dict[str, Any]:
    return {
        "verdict": "info",
        "summary": "Notice details logged for review against Irish tenancy standards.",
        "checks": [
            {
                "status": "info",
                "title": "Standard Notice Evaluation",
                "detail": "Consult RTB regulations for specific notice formats and guidelines.",
                "source": "Residential Tenancies Board Guidelines"
            }
        ],
        "key_dates": [],
        "next_steps": ["Check RTB.ie for relevant guidelines on non-standard notices."]
    }
