# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU).
#
# See LICENSE file in the project root for details.

from typing import Any

from diffprivlib.mechanisms import DPMechanism
from diffprivlib.mechanisms import Gaussian
from diffprivlib.mechanisms import GaussianAnalytic
from diffprivlib.mechanisms import Laplace
from diffprivlib.mechanisms import LaplaceBoundedDomain
from diffprivlib.mechanisms import LaplaceBoundedNoise
from diffprivlib.mechanisms import LaplaceTruncated
from sanic import Blueprint, Request, json

bp_dp = Blueprint('differential-privacy', url_prefix='/dp')

MECH_LAPLACE = {
    'name': ['laplace'],
    'args': [
        'epsilon',
        'delta',
        'sensitivity'
    ]
}
MECH_LAPLACE_TRUNCATED = {
    'name': ['laplace/truncated'],
    'args': [
        'epsilon',
        'delta',
        'sensitivity',
        'upper',
        'lower'
    ]
}
MECH_LAPLACE_DOMAIN = {
    'name': ['laplace/bounded-domain'],
    'args': [
        'epsilon',
        'delta',
        'sensitivity',
        'upper',
        'lower'
    ]
}
MECH_LAPLACE_NOISE = {
    'name': ['laplace/bounded-noise'],
    'args': [
        'epsilon',
        'delta',
        'sensitivity'
    ]
}
MECH_GAUSSIAN = {
    'name': ['gaussian'],
    'args': [
        'epsilon',
        'delta',
        'sensitivity'
    ]
}
MECH_GAUSSIAN_ANALYTIC = {
    'name': ['gaussian/analytic'],
    'args': [
        'epsilon',
        'delta',
        'sensitivity'
    ]
}

ITEM_PRUNE_LIST = [
    'mechanism',
    'epsilon',
    'delta',
    'sensitivity',
    'upper',
    'lower'
]

def get_mechanism(mechanism: str, **kwargs) -> DPMechanism:
    if mechanism in MECH_LAPLACE['name']:
        return Laplace(**prune_dict(kwargs, MECH_LAPLACE['args'], True))
    if mechanism in MECH_LAPLACE_TRUNCATED['name']:
        return LaplaceTruncated(**prune_dict(kwargs, MECH_LAPLACE_TRUNCATED['args'], True))
    if mechanism in MECH_LAPLACE_DOMAIN['name']:
        return LaplaceBoundedDomain(**prune_dict(kwargs, MECH_LAPLACE_DOMAIN['args'], True))
    if mechanism in MECH_LAPLACE_NOISE['name']:
        return LaplaceBoundedNoise(**prune_dict(kwargs, MECH_LAPLACE_NOISE['args'], True))
    if mechanism in MECH_GAUSSIAN['name']:
        return Gaussian(**prune_dict(kwargs, MECH_GAUSSIAN['args'], True))
    if mechanism in MECH_GAUSSIAN_ANALYTIC['name']:
        return GaussianAnalytic(**prune_dict(kwargs, MECH_GAUSSIAN_ANALYTIC['args'], True))
    raise ValueError(mechanism)

def prune_dict(item: dict[str, Any], prune: list[str], preserve: bool) -> dict[str, Any]:
    """
    Operates on a dictionary, removing unnecessary fields determined by the parameters
    :param item: The dictionary to process
    :param prune: A list of strings representing dictionary fields
    :param preserve: Determines how to interpret the prune list. When True, preserves fields present in the list. When
    False, removes fields not present in the list.
    :return: The processed dictionary
    """
    if preserve:
        return {f: item[f] for f in prune}
    for field in prune:
        if field in item:
            item.pop(field)
    return item

def apply_dp(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ret = list()
    for item in items:
        if item['mechanism'] is None:
            # Apply nothing
            ret.append(prune_dict(item, ITEM_PRUNE_LIST, False))
            continue

        mechanism_instance = get_mechanism(**item)

        for i in range(len(item['values'])):
            value_old = float(item['values'][i])
            tmp = mechanism_instance.randomise(value_old)
            assert isinstance(tmp, float) or isinstance(tmp, int), f'Value is not float or int: {tmp}'
            value_new = tmp
            item['values'][i] = value_new

        ret.append(prune_dict(item, ITEM_PRUNE_LIST, False))

    return ret


@bp_dp.post('/apply')
def dp_entrypoint(request: Request):
    tmp = request.json
    assert tmp is not None
    items = tmp['items']
    items_new = apply_dp(items)
    return json({'items': items_new})
