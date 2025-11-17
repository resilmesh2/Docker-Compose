from anonymizer.models.base import Model


def check_model_maintains_extra_fields(*fixtures: Model):
    arbitrary_fields = {
        'test-arbitrary-field-1': 1,
        'test-arbitrary-field-2': '2',
        'test-arbitrary-field-3': True,
        'test-arbitrary-field-4': 0.005,
        'test-arbitrary-field-5': {
            'test-inner-1': 1,
            'test-inner-2': '2',
        },
        'test-arbitrary-field-6': [
            1,
            2,
        ],
    }

    for fixture in fixtures:
        dictionary_form_1 = fixture.model_dump(by_alias=True)
        dictionary_form_1.update(arbitrary_fields)
        fixture_with_extra_fields = fixture.model_validate(dictionary_form_1)
        dictionary_form_2 = fixture_with_extra_fields.model_dump(by_alias=True)

        for key, value in arbitrary_fields.items():
            assert key in dictionary_form_2
            assert dictionary_form_2[key] == value
        assert dictionary_form_1 == dictionary_form_2
