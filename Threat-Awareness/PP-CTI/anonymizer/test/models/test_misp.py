from anonymizer.models import misp
from test.models import check_model_maintains_extra_fields


def test_misp_model_is_json_serializable(
        f_misp_EventMISP: misp.EventMISP,
        f_misp_EventAnon: misp.EventAnon,
        f_misp_Event: misp.Event,
        f_misp_Object: misp.Object,
        f_misp_Attribute: misp.Attribute):
    for fixture in [
            f_misp_EventMISP,
            f_misp_EventAnon,
            f_misp_Event,
            f_misp_Object,
            f_misp_Attribute,
    ]:
        assert fixture.model_dump_json(by_alias=True)


def test_misp_model_maintains_extra_fields(
        f_misp_EventMISP: misp.EventMISP,
        f_misp_EventAnon: misp.EventAnon,
        f_misp_Event: misp.Event,
        f_misp_Object: misp.Object,
        f_misp_Attribute: misp.Attribute):
    check_model_maintains_extra_fields(f_misp_EventMISP,
                                       f_misp_EventAnon,
                                       f_misp_Event,
                                       f_misp_Object,
                                       f_misp_Attribute)
