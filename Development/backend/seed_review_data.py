"""
Seed Script — Dummy Document Review Data
==========================================
Inserts a realistic sample document review with clause analysis
matching the ClauseGuard UI design (screenshot reference).

Usage:
    .venv/bin/python seed_review_data.py <document_id>

If no document_id is provided, it uses the first document in the database.
"""

import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.document import Document
from app.models.review import (
    ClauseReview,
    ClauseSource,
    DocumentReview,
    ReviewStatus,
    RiskLevel,
    SourceType,
)


DUMMY_CLAUSES = [
    # ── Clause 1: Compliant ────────────────────────────────────────────────────
    {
        "clause_number": 1,
        "clause_title": "Parties to the agreement",
        "clause_text": "This agreement is made between the Landlord and the Tenant as named on page 1 of this document.",
        "risk_level": RiskLevel.COMPLIANT,
        "color_code": "#16A34A",
        "plain_english": "This clause simply identifies who the landlord and tenant are. It is standard boilerplate language found in all Irish tenancy agreements.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [],
    },
    # ── Clause 2: Compliant ────────────────────────────────────────────────────
    {
        "clause_number": 2,
        "clause_title": "Term of the tenancy",
        "clause_text": "The tenancy shall be for a fixed term of 12 months commencing on the date specified on page 1.",
        "risk_level": RiskLevel.COMPLIANT,
        "color_code": "#16A34A",
        "plain_english": "This sets the lease duration to 12 months. Under Irish law, fixed-term tenancies are valid and give both parties certainty about the tenancy period.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [
            {
                "source_type": SourceType.LEGISLATION,
                "source_name": "Residential Tenancies Acts 2004–2022",
                "act_name": "Part 4 — Security of Tenure",
                "description": "Defines the legal framework for fixed-term and Part 4 tenancies.",
                "link": "https://www.irishstatutebook.ie/eli/2004/act/27/enacted/en/html",
            },
        ],
    },
    # ── Clause 3: Compliant ────────────────────────────────────────────────────
    {
        "clause_number": 3,
        "clause_title": "Rent payment",
        "clause_text": "The tenant must pay rent on the first day of each month.",
        "risk_level": RiskLevel.COMPLIANT,
        "color_code": "#16A34A",
        "plain_english": "This sets rent as due on the 1st of each month. This is a standard and legally compliant payment schedule.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [],
    },
    # ── Clause 4: Needs Review ─────────────────────────────────────────────────
    {
        "clause_number": 4,
        "clause_title": "Deposit retention",
        "clause_text": "The deposit of €2,400 may be retained by the landlord for any reason at the end of the tenancy.",
        "risk_level": RiskLevel.NEEDS_REVIEW,
        "color_code": "#F59E0B",
        "plain_english": "This clause says the landlord can keep the deposit for 'any reason'. Under Irish law, a landlord may only retain the deposit for specific, documented reasons such as unpaid rent or damage beyond normal wear and tear.",
        "flagging_reason": "The phrase 'for any reason' is overly broad and may not be enforceable. Irish law limits deposit retention to rent arrears and damage beyond fair wear and tear.",
        "suggested_steps": [
            "Ask the landlord to clarify the conditions under which the deposit may be retained.",
            "Request that the clause be amended to list specific, lawful retention grounds.",
        ],
        "sources": [
            {
                "source_type": SourceType.LEGISLATION,
                "source_name": "Residential Tenancies Acts 2004–2022",
                "act_name": "Section 12 — Obligations of landlords",
                "description": "Sets out landlord obligations including deposit handling and return.",
                "link": "https://www.irishstatutebook.ie/eli/2004/act/27/section/12/enacted/en/html",
            },
            {
                "source_type": SourceType.RTB_GUIDANCE,
                "source_name": "RTB guidance: Deposits",
                "act_name": None,
                "description": "RTB guidance on security deposit rules, including what landlords can and cannot deduct.",
                "link": "https://www.rtb.ie/registration-and-compliance/deposits",
            },
        ],
    },
    # ── Clause 5: Compliant ────────────────────────────────────────────────────
    {
        "clause_number": 5,
        "clause_title": "Use of property",
        "clause_text": "The property shall be used solely as a private residence by the tenant.",
        "risk_level": RiskLevel.COMPLIANT,
        "color_code": "#16A34A",
        "plain_english": "This restricts the property to residential use only. This is a standard clause in Irish residential leases.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [],
    },
    # ── Clause 6: Compliant ────────────────────────────────────────────────────
    {
        "clause_number": 6,
        "clause_title": "Insurance",
        "clause_text": "The landlord shall maintain building insurance for the duration of the tenancy.",
        "risk_level": RiskLevel.COMPLIANT,
        "color_code": "#16A34A",
        "plain_english": "The landlord is responsible for insuring the building. Tenants should arrange their own contents insurance separately.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [],
    },
    # ── Clause 7: Likely Unenforceable ─────────────────────────────────────────
    {
        "clause_number": 7,
        "clause_title": "Repairs and maintenance",
        "clause_text": "The tenant shall be responsible for all repairs to the property.",
        "risk_level": RiskLevel.LIKELY_UNENFORCEABLE,
        "color_code": "#DC2626",
        "plain_english": "This clause appears to transfer the landlord's statutory repair obligations to the tenant. Under Irish tenancy law, landlords generally have responsibility for keeping the property in good repair.",
        "flagging_reason": "The wording says 'all repairs', with no exception for structural defects, heating, plumbing or wiring. A tenant can't usually be made to give up protections the law gives them, so a term like this is unlikely to be enforceable.",
        "suggested_steps": [
            "Ask the landlord to amend this clause.",
            "Seek independent legal advice before signing.",
        ],
        "sources": [
            {
                "source_type": SourceType.LEGISLATION,
                "source_name": "Residential Tenancies Acts 2004–2022",
                "act_name": "Section 12(1)(b) — Landlord obligations for repair",
                "description": "Sets out landlord and tenant obligations, including repairs, deposits and rent review.",
                "link": "https://www.irishstatutebook.ie/eli/2004/act/27/section/12/enacted/en/html",
            },
            {
                "source_type": SourceType.RTB_GUIDANCE,
                "source_name": "RTB guidance: Tenant rights and responsibilities",
                "act_name": None,
                "description": "Plain-language summary of what landlords and tenants must each do.",
                "link": "https://www.rtb.ie/beginning-a-tenancy/rights-and-responsibilities",
            },
        ],
    },
    # ── Clause 8: Compliant ────────────────────────────────────────────────────
    {
        "clause_number": 8,
        "clause_title": "Guests and visitors",
        "clause_text": "The tenant may have guests visit the property at reasonable times.",
        "risk_level": RiskLevel.COMPLIANT,
        "color_code": "#16A34A",
        "plain_english": "You are free to have visitors at reasonable hours. This is a standard and fair clause.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [],
    },
    # ── Clause 9: Needs Review ─────────────────────────────────────────────────
    {
        "clause_number": 9,
        "clause_title": "Landlord access",
        "clause_text": "The landlord may enter the property at any time without prior notice.",
        "risk_level": RiskLevel.NEEDS_REVIEW,
        "color_code": "#F59E0B",
        "plain_english": "This clause gives the landlord unlimited access without notice. Irish law requires at least 24 hours' written notice before a landlord can enter the property, except in genuine emergencies.",
        "flagging_reason": "The phrase 'at any time without prior notice' conflicts with Section 12(1)(a) of the Residential Tenancies Act, which requires landlords to give reasonable notice (generally 24 hours).",
        "suggested_steps": [
            "Request the clause be amended to require at least 24 hours' written notice.",
            "The only exception should be genuine emergencies (e.g. burst pipe, fire).",
        ],
        "sources": [
            {
                "source_type": SourceType.LEGISLATION,
                "source_name": "Residential Tenancies Acts 2004–2022",
                "act_name": "Section 12(1)(a) — Peaceful and exclusive occupation",
                "description": "Guarantees the tenant's right to peaceful occupation; landlord must give notice before entry.",
                "link": "https://www.irishstatutebook.ie/eli/2004/act/27/section/12/enacted/en/html",
            },
        ],
    },
    # ── Clause 10: Likely Unenforceable ────────────────────────────────────────
    {
        "clause_number": 10,
        "clause_title": "Eviction terms",
        "clause_text": "The landlord may terminate this tenancy at any time with 7 days' notice.",
        "risk_level": RiskLevel.LIKELY_UNENFORCEABLE,
        "color_code": "#DC2626",
        "plain_english": "This clause allows eviction with only 7 days' notice. Irish law sets strict minimum notice periods ranging from 28 days to 224 days depending on the tenancy duration. A 7-day notice period is not legally valid.",
        "flagging_reason": "Under the Residential Tenancies Act, the minimum notice period for termination by a landlord ranges from 28 to 224 days depending on tenancy duration. A 7-day notice clause directly violates these statutory minimums.",
        "suggested_steps": [
            "This clause is likely void and unenforceable under Irish law.",
            "Request it be removed or amended to comply with statutory notice periods.",
            "Consult the RTB notice period calculator.",
        ],
        "sources": [
            {
                "source_type": SourceType.LEGISLATION,
                "source_name": "Residential Tenancies Acts 2004–2022",
                "act_name": "Part 5, Section 66 — Notice periods",
                "description": "Specifies minimum notice periods landlords must provide based on tenancy duration.",
                "link": "https://www.irishstatutebook.ie/eli/2004/act/27/section/66/enacted/en/html",
            },
            {
                "source_type": SourceType.RTB_GUIDANCE,
                "source_name": "RTB: Notice of Termination",
                "act_name": None,
                "description": "RTB guide explaining valid notice periods and how to serve a valid termination notice.",
                "link": "https://www.rtb.ie/ending-a-tenancy/notices-of-termination",
            },
        ],
    },
    # ── Clause 11: Needs Review ────────────────────────────────────────────────
    {
        "clause_number": 11,
        "clause_title": "Subletting",
        "clause_text": "The tenant shall not sublet or assign any part of the property without the written consent of the landlord.",
        "risk_level": RiskLevel.NEEDS_REVIEW,
        "color_code": "#F59E0B",
        "plain_english": "You cannot sublet or transfer your tenancy without the landlord's written permission. While landlords can restrict subletting, outright refusal without valid reason may be challengeable.",
        "flagging_reason": "A blanket prohibition on subletting could be considered unreasonable if the landlord refuses consent without valid grounds.",
        "suggested_steps": [
            "Clarify whether the landlord will consider subletting requests reasonably.",
            "Ensure any refusal is communicated in writing with valid reasons.",
        ],
        "sources": [
            {
                "source_type": SourceType.LEGISLATION,
                "source_name": "Residential Tenancies Acts 2004–2022",
                "act_name": "Section 16 — Subletting obligations",
                "description": "Sets out tenant obligations regarding subletting, including notification requirements.",
                "link": "https://www.irishstatutebook.ie/eli/2004/act/27/section/16/enacted/en/html",
            },
        ],
    },
    # ── Clause 12: Informational ───────────────────────────────────────────────
    {
        "clause_number": 12,
        "clause_title": "Governing law",
        "clause_text": "This agreement shall be governed by the laws of Ireland.",
        "risk_level": RiskLevel.INFORMATIONAL,
        "color_code": "#6B7280",
        "plain_english": "This confirms that Irish law applies to this lease. This is standard and expected for a property located in Ireland.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [],
    },
    # ── Clause 13: Likely Unenforceable ────────────────────────────────────────
    {
        "clause_number": 13,
        "clause_title": "Rent increases",
        "clause_text": "The landlord may increase the rent at any time by any amount deemed appropriate.",
        "risk_level": RiskLevel.LIKELY_UNENFORCEABLE,
        "color_code": "#DC2626",
        "plain_english": "This clause gives the landlord unrestricted power to increase rent. Under Irish law, rent can only be reviewed once every 24 months and increases in Rent Pressure Zones (RPZs) are capped at 2% per year or the rate of inflation, whichever is lower.",
        "flagging_reason": "Violates the Residential Tenancies (Amendment) Act 2021 which caps rent increases in RPZs and requires 24-month intervals between reviews. The phrase 'at any time by any amount' is directly contrary to these statutory protections.",
        "suggested_steps": [
            "Check if the property is in a Rent Pressure Zone (RPZ) using the RTB rent zone checker.",
            "Request the clause be amended to comply with the 2% RPZ cap or CPI-linked increase.",
            "Note: Rent reviews cannot occur more than once every 24 months.",
        ],
        "sources": [
            {
                "source_type": SourceType.LEGISLATION,
                "source_name": "Residential Tenancies (Amendment) Act 2021",
                "act_name": "Section 19 — Rent review restrictions in RPZs",
                "description": "Caps rent increases in Rent Pressure Zones at 2% per year or rate of inflation.",
                "link": "https://www.irishstatutebook.ie/eli/2021/act/39/enacted/en/html",
            },
            {
                "source_type": SourceType.RTB_GUIDANCE,
                "source_name": "RTB: Rent Reviews and Rent Pressure Zones",
                "act_name": None,
                "description": "Explains RPZ rules, rent caps, and how to check if a property is in an RPZ.",
                "link": "https://www.rtb.ie/rent-pressure-zones",
            },
        ],
    },
    # ── Clause 14: Informational ───────────────────────────────────────────────
    {
        "clause_number": 14,
        "clause_title": "RTB registration",
        "clause_text": "The landlord shall register this tenancy with the Residential Tenancies Board within one month of commencement.",
        "risk_level": RiskLevel.INFORMATIONAL,
        "color_code": "#6B7280",
        "plain_english": "Landlords are legally required to register all tenancies with the RTB within one month. This clause confirms compliance with that legal obligation.",
        "flagging_reason": None,
        "suggested_steps": None,
        "sources": [
            {
                "source_type": SourceType.RTB_GUIDANCE,
                "source_name": "RTB: Registration",
                "act_name": None,
                "description": "Information about tenancy registration requirements and timelines.",
                "link": "https://www.rtb.ie/registration-and-compliance/registering-a-tenancy",
            },
        ],
    },
    # ── Clause 15: Needs Review ────────────────────────────────────────────────
    {
        "clause_number": 15,
        "clause_title": "Pets",
        "clause_text": "No pets of any kind shall be kept on the property.",
        "risk_level": RiskLevel.NEEDS_REVIEW,
        "color_code": "#F59E0B",
        "plain_english": "This is a complete ban on pets. While landlords can restrict pets, a total ban may be considered unreasonable in some circumstances.",
        "flagging_reason": "While not explicitly prohibited by Irish law, a blanket 'no pets' clause has been challenged in RTB disputes. The RTB has found in some cases that a total pet ban can be unreasonable.",
        "suggested_steps": [
            "Discuss with the landlord whether a pet policy could be negotiated.",
            "Consider proposing a pet deposit or pet agreement as an alternative.",
        ],
        "sources": [
            {
                "source_type": SourceType.RTB_GUIDANCE,
                "source_name": "RTB: Dispute Resolution — Pet Disputes",
                "act_name": None,
                "description": "RTB case precedents on pet-related disputes in tenancies.",
                "link": "https://www.rtb.ie/dispute-resolution",
            },
        ],
    },
]


async def seed_review(document_id: str | None = None) -> None:
    async with AsyncSessionLocal() as db:
        # Find the target document
        if document_id:
            result = await db.execute(select(Document).where(Document.id == document_id))
        else:
            result = await db.execute(select(Document).limit(1))

        doc = result.scalar_one_or_none()
        if not doc:
            print("❌  No document found in the database. Upload a document first.")
            return

        print(f"📄  Using document: {doc.original_filename} (ID: {doc.id})")

        # Check if review already exists
        existing = await db.execute(
            select(DocumentReview).where(DocumentReview.document_id == doc.id)
        )
        if existing.scalar_one_or_none():
            print("⚠️   Review already exists for this document. Delete it first to re-seed.")
            return

        # Count by risk level
        counts = {
            RiskLevel.LIKELY_UNENFORCEABLE: 0,
            RiskLevel.NEEDS_REVIEW: 0,
            RiskLevel.COMPLIANT: 0,
            RiskLevel.INFORMATIONAL: 0,
        }
        for c in DUMMY_CLAUSES:
            counts[c["risk_level"]] += 1

        # Create review
        review = DocumentReview(
            document_id=doc.id,
            total_clauses=len(DUMMY_CLAUSES),
            likely_unenforceable_count=counts[RiskLevel.LIKELY_UNENFORCEABLE],
            needs_review_count=counts[RiskLevel.NEEDS_REVIEW],
            compliant_count=counts[RiskLevel.COMPLIANT],
            informational_count=counts[RiskLevel.INFORMATIONAL],
            review_status=ReviewStatus.COMPLETED,
            reviewed_at=datetime.now(timezone.utc),
        )
        db.add(review)
        await db.flush()

        # Create clauses with sources
        for clause_data in DUMMY_CLAUSES:
            clause = ClauseReview(
                review_id=review.id,
                clause_number=clause_data["clause_number"],
                clause_title=clause_data["clause_title"],
                clause_text=clause_data["clause_text"],
                risk_level=clause_data["risk_level"],
                color_code=clause_data["color_code"],
                plain_english=clause_data["plain_english"],
                flagging_reason=clause_data["flagging_reason"],
                suggested_steps=(
                    json.dumps(clause_data["suggested_steps"])
                    if clause_data["suggested_steps"] else None
                ),
            )
            db.add(clause)
            await db.flush()

            for source_data in clause_data.get("sources", []):
                source = ClauseSource(
                    clause_review_id=clause.id,
                    source_type=source_data["source_type"],
                    source_name=source_data["source_name"],
                    act_name=source_data.get("act_name"),
                    description=source_data.get("description"),
                    link=source_data.get("link"),
                )
                db.add(source)

        await db.commit()

        print(f"\n✅  Document review seeded successfully!")
        print(f"    Review ID       : {review.id}")
        print(f"    Document ID     : {doc.id}")
        print(f"    Total clauses   : {len(DUMMY_CLAUSES)}")
        print(f"    🔴 Unenforceable: {counts[RiskLevel.LIKELY_UNENFORCEABLE]}")
        print(f"    🟡 Needs review : {counts[RiskLevel.NEEDS_REVIEW]}")
        print(f"    🟢 Compliant    : {counts[RiskLevel.COMPLIANT]}")
        print(f"    ⚫ Informational: {counts[RiskLevel.INFORMATIONAL]}")
        print(f"\n    Test it: GET http://127.0.0.1:8000/api/v1/docreview/{doc.id}")


if __name__ == "__main__":
    doc_id = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(seed_review(doc_id))
