from app.models.incident import IncidentSeverity
from app.services.ppe_incident_rules import classify_violation


def test_classifies_no_hardhat():
    result = classify_violation("no-hardhat")
    assert result is not None
    label, severity = result
    assert label == "Missing Helmet"
    assert severity == IncidentSeverity.HIGH


def test_classifies_underscore_and_space_variants():
    assert classify_violation("no_vest")[0] == "Missing Vest"
    assert classify_violation("No Mask")[0] == "Missing Mask"
    assert classify_violation("no-goggles")[0] == "Missing Goggles"
    assert classify_violation("no_gloves")[0] == "Missing Gloves"


def test_non_violation_classes_return_none():
    assert classify_violation("person") is None
    assert classify_violation("hardhat") is None
    assert classify_violation("forklift") is None
