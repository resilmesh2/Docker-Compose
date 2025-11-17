import datetime
from time import time

import pytest
from pytest_mock import MockerFixture
from sanic_testing.reusable import ReusableClient

from anonymizer.models import arxlet, flaskdp, misp, policies
from anonymizer.server import anonymizer as get_sanic_instance


@pytest.fixture
def f_policies_DpPolicyMetadata() -> policies.DpPolicyMetadata:
    return policies.DpPolicyMetadata(epsilon=0,
                                     delta=0,
                                     sensitivity=0,
                                     upper=0,
                                     lower=0)


@pytest.fixture
def f_policies_DpPolicy(
        f_policies_DpPolicyMetadata: policies.DpPolicyMetadata,
) -> policies.DpPolicy:
    return policies.DpPolicy(scheme='', metadata=f_policies_DpPolicyMetadata)


@pytest.fixture
def f_policies_DpObjectPolicy(
        f_policies_DpPolicyMetadata: policies.DpPolicyMetadata,
) -> policies.DpObjectPolicy:
    return policies.DpObjectPolicy(**{
        'scheme': '',
        'metadata': f_policies_DpPolicyMetadata,
        'attribute-names': [''],
        'apply-to-all': False,
    })


@pytest.fixture
def f_policies_DpAttributePolicy(
        f_policies_DpPolicy: policies.DpPolicy,
) -> policies.DpAttributePolicy:
    return policies.DpAttributePolicy(
        **f_policies_DpPolicy.model_dump(by_alias=True),
    )


@pytest.fixture
def f_policies_PetMetadata() -> policies.PetMetadata:
    return policies.PetMetadata(l=0, c=0, k=0, t=0, level=0)


@pytest.fixture
def f_policies_Pet(f_policies_PetMetadata: policies.PetMetadata,
                   ) -> policies.Pet:
    return policies.Pet(scheme='', metadata=f_policies_PetMetadata)


@pytest.fixture
def f_policies_AttributePolicyWithoutDp(f_policies_Pet: policies.Pet,
                                    ) -> policies.AttributePolicyWithoutDp:
    return policies.AttributePolicyWithoutDp(name='',
                                             type='',
                                             pets=[f_policies_Pet])


@pytest.fixture
def f_policies_AttributePolicy(
        f_policies_Pet: policies.Pet,
        f_policies_DpAttributePolicy: policies.DpAttributePolicy,
) -> policies.AttributePolicy:
    return policies.AttributePolicy(**{
        'name': '',
        'type': '',
        'pets': [f_policies_Pet],
        'dp': False,
        'dp-policy': f_policies_DpAttributePolicy,
    })


@pytest.fixture
def f_policies_Template(
        f_policies_AttributePolicyWithoutDp: policies.AttributePolicyWithoutDp,
        f_policies_DpObjectPolicy: policies.DpObjectPolicy,
) -> policies.Template:
    return policies.Template(**{
        'attributes': [f_policies_AttributePolicyWithoutDp],
        'name': '',
        # Autogenerate UUID
        'k-anonymity': False,
        'k-map': False,
        'k': 0,
        'dp': False,
        'dp-policy': f_policies_DpObjectPolicy,
    })


@pytest.fixture
def f_policies_PrivacyPolicy(
        f_policies_AttributePolicy: policies.AttributePolicy,
        f_policies_Template: policies.Template,
) -> policies.PrivacyPolicy:
    return policies.PrivacyPolicy(attributes=[f_policies_AttributePolicy],
                                  creator='',
                                  organization='',
                                  templates=[f_policies_Template],
                                  version='')


@pytest.fixture
def f_policies_AttributeGeneralization() -> policies.AttributeGeneralization:
    return policies.AttributeGeneralization(generalization=[''],
                                            interval=[''],
                                            regex=[''])


@pytest.fixture
def f_policies_HierarchyAttribute(
        f_policies_AttributeGeneralization: policies.AttributeGeneralization,
) -> policies.HierarchyAttribute:
    return policies.HierarchyAttribute(**{
        'attribute-name': '',
        'attribute-type': '',
        'attribute-generalization': [f_policies_AttributeGeneralization],
    })


@pytest.fixture
def f_policies_HierarchyObject(
        f_policies_HierarchyAttribute: policies.HierarchyAttribute,
) -> policies.HierarchyObject:
    return policies.HierarchyObject(**{
        'misp-object-template': '',
        'attribute-hierarchies': [f_policies_HierarchyAttribute],
    })


@pytest.fixture
def f_policies_HierarchyPolicy(
        f_policies_HierarchyObject: policies.HierarchyObject,
        f_policies_HierarchyAttribute: policies.HierarchyAttribute,
) -> policies.HierarchyPolicy:
    return policies.HierarchyPolicy(**{
        'hierarchy-description': '',
        # Autogenerate UUID
        'organization': '',
        'version': '',
        'creator': '',
        'hierarchy_objects': [f_policies_HierarchyObject],
        'hierarchy_attributes': [f_policies_HierarchyAttribute],
    })


@pytest.fixture
def f_misp_Attribute() -> misp.Attribute:
    return misp.Attribute(type='', object_relation='', value='')


@pytest.fixture
def f_misp_Object(f_misp_Attribute: misp.Attribute) -> misp.Object:
    return misp.Object(name='',
                       timestamp=str(int(time())),
                       Attribute=[f_misp_Attribute])


@pytest.fixture
def f_misp_Tag() -> misp.Tag:
    return misp.Tag(id='', name='')


@pytest.fixture
def f_misp_Event(f_misp_Attribute: misp.Attribute,
                 f_misp_Object: misp.Object,
                 f_misp_Tag: misp.Tag,
                 ) -> misp.Event:
    return misp.Event(date=datetime.date(2024, 5, 28),
                      timestamp=str(int(time())),
                      threat_level_id=misp.ThreatLevel.UNDEFINED,
                      Attribute=[f_misp_Attribute],
                      Object=[f_misp_Object],
                      Tag=[f_misp_Tag])


@pytest.fixture
def f_misp_EventAnon(f_misp_Event: misp.Event,
                     f_policies_PrivacyPolicy: policies.PrivacyPolicy,
                     f_policies_HierarchyPolicy: policies.HierarchyPolicy,
                     ) -> misp.EventAnon:
    return misp.EventAnon(**{
        'Event': f_misp_Event,
        'Privacy-policy': f_policies_PrivacyPolicy,
        'Hierarchy-policy': f_policies_HierarchyPolicy,
    })


@pytest.fixture
def f_misp_EventMISP(f_misp_Event: misp.Event) -> misp.EventMISP:
    return misp.EventMISP(Event=f_misp_Event)


@pytest.fixture
def f_flaskdp_ItemResponse() -> flaskdp.ItemResponse:
    return flaskdp.ItemResponse(id='', values=[0])


@pytest.fixture
def f_flaskdp_ItemRequest() -> flaskdp.ItemRequest:
    return flaskdp.ItemRequest(id='',
                               values=[0],
                               epsilon=0,
                               delta=0,
                               sensitivity=0,
                               mechanism=flaskdp.Mechanism.LAPLACE,
                               upper=0,
                               lower=0)


@pytest.fixture
def f_flaskdp_FlaskDPResponse(f_flaskdp_ItemResponse: flaskdp.ItemResponse,
                              ) -> flaskdp.FlaskDPResponse:
    return flaskdp.FlaskDPResponse(items=[f_flaskdp_ItemResponse])


@pytest.fixture
def f_flaskdp_FlaskDPRequest(f_flaskdp_ItemRequest: flaskdp.ItemRequest,
                             ) -> flaskdp.FlaskDPRequest:
    return flaskdp.FlaskDPRequest(items=[f_flaskdp_ItemRequest])


@pytest.fixture
def f_arxlet_KAnonMetadata() -> arxlet.KAnonMetadata:
    return arxlet.KAnonMetadata(k=0)


@pytest.fixture
def f_arxlet_KMapMetadata(f_arxlet_ObjectData: arxlet.ObjectData,
                          ) -> arxlet.KMapMetadata:
    return arxlet.KMapMetadata(k=0, context=[[f_arxlet_ObjectData]])


@pytest.fixture
def f_arxlet_SensitiveMetadata() -> arxlet.SensitiveMetadata:
    return arxlet.SensitiveMetadata(attribute='')


@pytest.fixture
def f_arxlet_LDivMetadata() -> arxlet.LDivMetadata:
    return arxlet.LDivMetadata(attribute='', l=0)


@pytest.fixture
def f_arxlet_CLDivMetadata() -> arxlet.CLDivMetadata:
    return arxlet.CLDivMetadata(attribute='', l=0, c=0)


@pytest.fixture
def f_arxlet_TCloMetadata() -> arxlet.TCloMetadata:
    return arxlet.TCloMetadata(attribute='', t=0)


@pytest.fixture
def f_arxlet_Attribute() -> arxlet.Attribute:
    return arxlet.Attribute(type='', value='')


@pytest.fixture
def f_arxlet_Object(f_arxlet_Attribute: arxlet.Attribute) -> arxlet.Object:
    return arxlet.Object(type='', values=[f_arxlet_Attribute])


@pytest.fixture
def f_arxlet_Pet(f_arxlet_KAnonMetadata: arxlet.KAnonMetadata) -> arxlet.Pet:
    return arxlet.Pet(scheme='', metadata=f_arxlet_KAnonMetadata)


@pytest.fixture
def f_arxlet_Hierarchy() -> arxlet.Hierarchy:
    return arxlet.Hierarchy(type='', values=[''])


@pytest.fixture
def f_arxlet_AttributeData() -> arxlet.AttributeData:
    return arxlet.AttributeData(value='', hierarchies=[''])


@pytest.fixture
def f_arxlet_ObjectData(f_arxlet_Attribute: arxlet.Attribute,
                        f_arxlet_Hierarchy: arxlet.Hierarchy,
                        ) -> arxlet.ObjectData:
    return arxlet.ObjectData(values=[f_arxlet_Attribute],
                             hierarchies=[f_arxlet_Hierarchy])


@pytest.fixture
def f_arxlet_AttributeRequest(f_arxlet_AttributeData: arxlet.AttributeData,
                              f_arxlet_Pet: arxlet.Pet,
                              ) -> arxlet.AttributeRequest:
    return arxlet.AttributeRequest(data=[f_arxlet_AttributeData],
                                   pets=[f_arxlet_Pet])


@pytest.fixture
def f_arxlet_AttributeResponseSingle(f_arxlet_Attribute: arxlet.Attribute,
                                     ) -> arxlet.AttributeResponseSingle:
    return arxlet.AttributeResponseSingle(
        **f_arxlet_Attribute.model_dump(by_alias=True),
    )


@pytest.fixture
def f_arxlet_ObjectRequest(f_arxlet_ObjectData: arxlet.ObjectData,
                           f_arxlet_Pet: arxlet.Pet,
                           ) -> arxlet.ObjectRequest:
    return arxlet.ObjectRequest(data=[f_arxlet_ObjectData],
                                pets=[f_arxlet_Pet])


@pytest.fixture
def f_arxlet_ObjectResponseSingle(f_arxlet_Object: arxlet.Object,
                                  ) -> arxlet.ObjectResponseSingle:
    return arxlet.ObjectResponseSingle(
        **f_arxlet_Object.model_dump(by_alias=True),
    )


@pytest.fixture
def f_sanic(mocker: MockerFixture):

    # Create ValkeyClient.log_audit() mock
    mocker.patch('anonymizer.clients.valkey.ValkeyClient.log_audit')

    client = ReusableClient(get_sanic_instance())
    with client:
        yield client


@pytest.fixture
def f_misp_transformer_headers() -> dict[str, str]:
    return {
        'Transformer-Type': 'misp.MispTransformer',
    }


@pytest.fixture
def f_no_transformer_headers() -> dict[str, str]:
    return {
        'Transformer-Type': 'NoTransformer',
    }


@pytest.fixture
def f_keycloak_auth_headers() -> dict[str, str]:
    return {
        'Username': 'test-user',
        'Password': 'test-password',
    }
