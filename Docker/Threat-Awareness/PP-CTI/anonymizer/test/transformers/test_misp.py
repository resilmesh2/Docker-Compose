import pytest
from anonymizer.models.data_model import Request
from anonymizer.models.misp import EventAnon
from anonymizer.transformers.misp import MispTransformer


@pytest.fixture
def f_MispTransformer() -> MispTransformer:
    return MispTransformer()


def test_transform_and_update_work_together_well(
        f_MispTransformer: MispTransformer,
        f_misp_EventAnon: EventAnon):
    extracted_data = f_MispTransformer.transform(f_misp_EventAnon)
    f_MispTransformer.update(f_misp_EventAnon, extracted_data)
    extracted_data_2 = f_MispTransformer.transform(f_misp_EventAnon)

    assert Request.to_dict(extracted_data) == Request.to_dict(extracted_data_2)
