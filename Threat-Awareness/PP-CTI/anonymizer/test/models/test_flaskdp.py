from anonymizer.models import flaskdp
from test.models import check_model_maintains_extra_fields


def test_flaskdp_model_is_json_serializable(
        f_flaskdp_FlaskDPRequest: flaskdp.FlaskDPRequest,
        f_flaskdp_FlaskDPResponse: flaskdp.FlaskDPResponse,
        f_flaskdp_ItemRequest: flaskdp.ItemRequest,
        f_flaskdp_ItemResponse: flaskdp.ItemResponse):
    for fixture in [
            f_flaskdp_FlaskDPRequest,
            f_flaskdp_FlaskDPResponse,
            f_flaskdp_ItemRequest,
            f_flaskdp_ItemResponse,
    ]:
        assert fixture.model_dump_json(by_alias=True)


def test_flaskdp_model_maintains_extra_fields(
        f_flaskdp_FlaskDPRequest: flaskdp.FlaskDPRequest,
        f_flaskdp_FlaskDPResponse: flaskdp.FlaskDPResponse,
        f_flaskdp_ItemRequest: flaskdp.ItemRequest,
        f_flaskdp_ItemResponse: flaskdp.ItemResponse):
    check_model_maintains_extra_fields(f_flaskdp_FlaskDPRequest,
                                       f_flaskdp_FlaskDPResponse,
                                       f_flaskdp_ItemRequest,
                                       f_flaskdp_ItemResponse)
