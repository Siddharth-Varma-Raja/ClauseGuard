import difflib

class TemplateDiffEngine:
    def __init__(self):
        # In production, load this from the local file system or Member 1's DB
        self.rtb_baseline_text = "Standard RTB Tenancy Agreement..." 

    def compare_to_baseline(self, user_text: str) -> list:
        deviations = []
        differ = difflib.SequenceMatcher(None, self.rtb_baseline_text, user_text)
        
        for tag, i1, i2, j1, j2 in differ.get_opcodes():
            if tag == 'delete':
                deviations.append(f"Missing standard clause near character {i1}")
            elif tag == 'insert':
                deviations.append(f"Custom clause inserted near character {j1}")
            elif tag == 'replace':
                deviations.append(f"Standard wording modified near character {i1}")
                
        return deviations