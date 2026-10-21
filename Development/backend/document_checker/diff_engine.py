"""
Template Diff & Lease Verification Engine
===========================================
1. Verifies whether an uploaded document is legitimately a residential lease agreement
   based on tenancy semantic indicators, legal vocabulary, and RTB structure.
2. Compares lease text against the standard Residential Tenancies Board (RTB) model
   tenancy agreement to identify deviations, custom clauses, and omitted protections.
"""

import difflib
import re
from typing import List, Tuple


# Standard Irish RTB Model Tenancy Agreement Baseline
RTB_BASELINE_TEXT = """
Residential Tenancy Agreement (Standard RTB Model Form)
Parties: This agreement is made between the Landlord and the Tenant.
Dwelling: The Landlord agrees to let and the Tenant agrees to take the residential property.
Term: The tenancy shall commence on the commencement date for a specified period.
Rent: The rent payable shall be in euro, payable in advance on the due date.
Deposit: A security deposit shall be paid upon signing and held in accordance with the Residential Tenancies Act.
Obligations of Landlord:
1. To allow the tenant peaceful and exclusive occupation of the dwelling without interruption.
2. Not to enter the dwelling without giving at least 24 hours advance written notice, except in emergencies.
3. To maintain and repair the structure and interior of the dwelling.
4. To provide a written receipt or statement of rent paid.
Obligations of Tenant:
1. To pay the rent on the due date.
2. Not to assign or sublet the dwelling without the landlord's written consent.
3. To notify the landlord of any defects or disrepair.
4. To allow reasonable access for inspection or repairs upon due notice.
Termination:
Either party may terminate the tenancy only in compliance with the statutory notice periods and provisions of Part 4 and Part 5 of the Residential Tenancies Acts 2004-2022.
"""

# Core vocabulary required to qualify as a residential tenancy agreement
CORE_LEASE_KEYWORDS = [
    r"\blandlord\b",
    r"\btenant\b",
    r"\btenanc(?:y|ies)\b",
    r"\brent(?:al)?\b",
    r"\blease\b",
    r"\bpremises\b",
    r"\bdwelling\b",
    r"\bdeposit\b",
    r"\bresidential\b",
    r"\bagreement\b",
]

SECONDARY_LEASE_KEYWORDS = [
    r"\brtb\b",
    r"\bresidential tenancies\b",
    r"\bquiet enjoyment\b",
    r"\bpeaceful occupation\b",
    r"\bnotice period\b",
    r"\bterm of the tenancy\b",
    r"\binventory\b",
    r"\bsublet\b",
    r"\butility bills\b",
    r"\bfurnished\b",
]


class TemplateDiffEngine:
    def __init__(self, baseline_text: str = RTB_BASELINE_TEXT):
        self.rtb_baseline_text = baseline_text.strip()

    def is_lease(self, text: str, threshold: float = 0.4) -> Tuple[bool, float, List[str]]:
        """
        Validates whether the text is actually a residential lease agreement.

        Parameters
        ----------
        text : str
            Extracted text from the uploaded PDF/document.
        threshold : float
            Minimum confidence score required (0.0 to 1.0).

        Returns
        -------
        Tuple[bool, float, List[str]]
            (is_valid_lease, confidence_score, matched_indicators)
        """
        if not text or len(text.strip()) < 50:
            return False, 0.0, []

        lower_text = text.lower()
        matched_core = [kw for kw in CORE_LEASE_KEYWORDS if re.search(kw, lower_text)]
        matched_secondary = [kw for kw in SECONDARY_LEASE_KEYWORDS if re.search(kw, lower_text)]

        # Must have at least 'landlord' and 'tenant' or 'tenancy' and 'rent'
        has_primary_parties = bool(re.search(r"\blandlord\b", lower_text) and re.search(r"\btenant\b", lower_text))
        has_tenancy_terms = bool(re.search(r"\btenanc(?:y|ies)\b", lower_text) or re.search(r"\blease\b", lower_text))
        has_rent_terms = bool(re.search(r"\brent\b", lower_text) or re.search(r"\bdeposit\b", lower_text))

        core_score = len(matched_core) / len(CORE_LEASE_KEYWORDS)
        secondary_score = len(matched_secondary) / len(SECONDARY_LEASE_KEYWORDS)
        confidence = (core_score * 0.7) + (secondary_score * 0.3)

        # Qualification rules:
        # 1. Must score above threshold
        # 2. Must match essential parties (landlord + tenant) OR tenancy + rent terms
        is_valid = (confidence >= threshold) and (
            has_primary_parties or (has_tenancy_terms and has_rent_terms)
        )

        all_matched = [k.strip(r"\b") for k in (matched_core + matched_secondary)]
        return is_valid, round(confidence, 2), all_matched

    def compare_to_baseline(self, user_text: str) -> List[str]:
        """
        Compare user lease text against the standard RTB baseline and report deviations.
        """
        deviations = []
        differ = difflib.SequenceMatcher(None, self.rtb_baseline_text, user_text)

        for tag, i1, i2, j1, j2 in differ.get_opcodes():
            if tag == 'delete':
                snippet = self.rtb_baseline_text[i1:min(i1 + 40, i2)].strip()
                deviations.append(f"Omission of standard baseline protection: '{snippet}...'")
            elif tag == 'insert':
                snippet = user_text[j1:min(j1 + 40, j2)].strip()
                deviations.append(f"Non-standard clause inserted: '{snippet}...'")
            elif tag == 'replace':
                snippet = user_text[j1:min(j1 + 40, j2)].strip()
                deviations.append(f"Standard RTB wording modified: '{snippet}...'")

        return deviations