from anonymizer.models import policies
from test.models import check_model_maintains_extra_fields


def test_policies_model_is_json_serializable(
        f_policies_HierarchyPolicy: policies.HierarchyPolicy,
        f_policies_HierarchyObject: policies.HierarchyObject,
        f_policies_HierarchyAttribute: policies.HierarchyAttribute,
        f_policies_AttributeGeneralization: policies.AttributeGeneralization,
        f_policies_PrivacyPolicy: policies.PrivacyPolicy,
        f_policies_Template: policies.Template,
        f_policies_AttributePolicy: policies.AttributePolicy,
        f_policies_AttributePolicyWithoutDp: policies.AttributePolicyWithoutDp,
        f_policies_Pet: policies.Pet,
        f_policies_PetMetadata: policies.PetMetadata,
        f_policies_DpAttributePolicy: policies.DpAttributePolicy,
        f_policies_DpObjectPolicy: policies.DpObjectPolicy,
        f_policies_DpPolicy: policies.DpPolicy,
        f_policies_DpPolicyMetadata: policies.DpPolicyMetadata):
    for fixture in [
            f_policies_HierarchyPolicy,
            f_policies_HierarchyObject,
            f_policies_HierarchyAttribute,
            f_policies_AttributeGeneralization,
            f_policies_PrivacyPolicy,
            f_policies_Template,
            f_policies_AttributePolicy,
            f_policies_AttributePolicyWithoutDp,
            f_policies_Pet,
            f_policies_PetMetadata,
            f_policies_DpAttributePolicy,
            f_policies_DpObjectPolicy,
            f_policies_DpPolicy,
            f_policies_DpPolicyMetadata,
    ]:
        assert fixture.model_dump_json(by_alias=True)


def test_policies_model_maintains_extra_fields(
        f_policies_HierarchyPolicy: policies.HierarchyPolicy,
        f_policies_HierarchyObject: policies.HierarchyObject,
        f_policies_HierarchyAttribute: policies.HierarchyAttribute,
        f_policies_AttributeGeneralization: policies.AttributeGeneralization,
        f_policies_PrivacyPolicy: policies.PrivacyPolicy,
        f_policies_Template: policies.Template,
        f_policies_AttributePolicy: policies.AttributePolicy,
        f_policies_AttributePolicyWithoutDp: policies.AttributePolicyWithoutDp,
        f_policies_Pet: policies.Pet,
        f_policies_PetMetadata: policies.PetMetadata,
        f_policies_DpAttributePolicy: policies.DpAttributePolicy,
        f_policies_DpObjectPolicy: policies.DpObjectPolicy,
        f_policies_DpPolicy: policies.DpPolicy,
        f_policies_DpPolicyMetadata: policies.DpPolicyMetadata):
    check_model_maintains_extra_fields(f_policies_HierarchyPolicy,
                                       f_policies_HierarchyObject,
                                       f_policies_HierarchyAttribute,
                                       f_policies_AttributeGeneralization,
                                       f_policies_PrivacyPolicy,
                                       f_policies_Template,
                                       f_policies_AttributePolicy,
                                       f_policies_AttributePolicyWithoutDp,
                                       f_policies_Pet,
                                       f_policies_PetMetadata,
                                       f_policies_DpAttributePolicy,
                                       f_policies_DpObjectPolicy,
                                       f_policies_DpPolicy,
                                       f_policies_DpPolicyMetadata)
