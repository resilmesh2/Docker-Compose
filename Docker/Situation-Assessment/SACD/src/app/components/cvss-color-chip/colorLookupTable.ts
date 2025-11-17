
export const colorLookupTable: Record<string, Record<string, Record<string, string>>> = {
    "default": {
        "attack_vector": {
            "network": "high",
            "adjacent": "high",
            "local": "medium",
            "physical": "low"
        },
        "attack_complexity": {
            "low": "high",
            "high": "medium"
        },
        "privileges_required": {
            "none": "high",
            "low": "medium",
            "high": "low"
        },
        "user_interaction": {
            "none": "high",
            "required": "medium"
        },
        "scope": {
            "unchanged": "high",
            "changed": "medium"
        },
        "confidentiality_impact": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "integrity_impact": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "availability_impact": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
    },
    "v2": {
        "access_vector": {
            "network": "high",
            "adjacent": "medium",
            "local": "low"
        },
        "access_complexity": {
            "low": "high",
            "medium": "medium",
            "high": "low"
        },
        "authentication": {
            "none": "high",
            "single": "medium",
            "multiple": "low"
        },
        "confidentiality_impact": {
            "none": "none",
            "partial": "medium",
            "complete": "high"
        },
        "integrity_impact": {
            "none": "none",
            "partial": "medium",
            "complete": "high"
        },
        "availability_impact": {
            "none": "none",
            "partial": "medium",
            "complete": "high"
        },
    },
    "v40": {
        "attack_requirements": {
            "none": "high",
            "present": "medium",
        },
        "user_interaction": {
            "none": "high",
            "passive": "medium",
            "active": "low"
        },
        "vulnerable_system_confidentiality": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "vulnerable_system_integrity": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "vulnerable_system_availability": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "subsequent_system_confidentiality": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "subsequent_system_integrity": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "subsequent_system_availability": {
            "none": "none",
            "low": "medium",
            "high": "high"
        },
        "exploit_maturity": {
            "not_defined": "unknown",
            "attacked": "high",
            "poc": "medium",
            "unreported": "low",
        }
    }
}