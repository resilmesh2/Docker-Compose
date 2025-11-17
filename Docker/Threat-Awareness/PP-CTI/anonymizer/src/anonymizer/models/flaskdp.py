# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations

from enum import StrEnum

from anonymizer.models.base import Model


VERSION: str = '1'


class Mechanism(StrEnum):
    LAPLACE = 'laplace'
    LAPLACE_TRUNCATED = 'laplace/truncated'
    LAPLACE_BOUNDED_DOMAIN = 'laplace/bounded-domain'
    LAPLACE_BOUNDED_NOISE = 'laplace/bounded-noise'
    GAUSSIAN = 'gaussian'
    GAUSSIAN_ANALYTIC = 'gaussian/analytic'

    @classmethod
    def from_string(cls, s: str) -> Mechanism:
        lower = s.lower()
        # Default method: Laplace
        mech = Mechanism.LAPLACE
        if lower == 'laplace':
            mech = Mechanism.LAPLACE
        if lower == 'laplace/truncated':
            mech = Mechanism.LAPLACE_TRUNCATED
        if lower == 'laplace/bounded-domain':
            mech = Mechanism.LAPLACE_BOUNDED_DOMAIN
        if lower == 'laplace/bounded-noise':
            mech = Mechanism.LAPLACE_BOUNDED_NOISE
        if lower == 'gaussian':
            mech = Mechanism.GAUSSIAN
        if lower == 'gaussian/analytic':
            mech = Mechanism.GAUSSIAN_ANALYTIC
        return mech


class ItemResponse(Model):
    id: str
    values: list[float]


class ItemRequest(ItemResponse):
    epsilon: float
    delta: float
    sensitivity: float
    mechanism: Mechanism
    upper: float
    lower: float


class FlaskDPResponse(Model):
    items: list[ItemResponse]


class FlaskDPRequest(Model):
    items: list[ItemRequest]
