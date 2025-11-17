# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

import bisect
import re
from uuid import uuid4

from pydantic import Field

from anonymizer.models.base import Model


class DpPolicyMetadata(Model):
    epsilon: float
    delta: float
    sensitivity: float
    high_bounds: float = Field(alias='upper')
    low_bounds: float = Field(alias='lower')


class DpPolicy(Model):
    scheme: str
    metadata: DpPolicyMetadata


class DpObjectPolicy(DpPolicy):
    attribute_names: list[str] = Field(alias='attribute-names')
    apply_to_all: bool = Field(alias='apply-to-all')


class DpAttributePolicy(DpPolicy):
    pass


class PetMetadata(Model):
    l: int | None = 0  # noqa: E741
    c: float | None = 0.0
    k: int | None = 0
    t: float | None = 0.0
    level: int | None = 0


class Pet(Model):
    scheme: str
    metadata: PetMetadata


class AttributePolicyWithoutDp(Model):
    name: str
    type: str
    pets: list[Pet]


class AttributePolicy(AttributePolicyWithoutDp):
    dp: bool
    dp_policy: DpAttributePolicy = Field(None, alias='dp-policy')


class Template(Model):
    attributes: list[AttributePolicyWithoutDp]
    name: str
    uuid: str | None = str(uuid4())
    k_anonymity: bool = Field(alias='k-anonymity')
    k_map: bool = Field(alias='k-map')
    k: int
    dp: bool
    dp_policy: DpObjectPolicy | None = Field(None, alias='dp-policy')


class PrivacyPolicy(Model):
    attributes: list[AttributePolicy] | None = None
    creator: str
    uuid: str | None = str(uuid4())
    organization: str
    templates: list[Template] | None = None
    version: str


class AttributeGeneralization(Model):
    generalization: list[str]
    interval: list[str]
    regex: list[str]


class HierarchyAttribute(Model):
    attribute_name: str = Field(alias='attribute-name')
    attribute_type: str = Field(alias='attribute-type')
    attribute_generalization: list[AttributeGeneralization] = Field(
        alias='attribute-generalization',
    )


class HierarchyObject(Model):
    misp_object_template: str = Field(alias='misp-object-template')
    attribute_hierarchies: list[HierarchyAttribute] = Field(
        alias='attribute-hierarchies',
    )


class HierarchyPolicy(Model):
    hierarchy_description: str | None = Field(None,
                                              alias='hierarchy-description')
    uuid: str | None = str(uuid4())
    organization: str
    version: str
    creator: str
    hierarchy_objects: list[HierarchyObject]
    hierarchy_attributes: list[HierarchyAttribute]


def get_hierarchy_values(value: str,
                         hierarchy: HierarchyAttribute,
                         ) -> list[str]:
    ret = []
    if hierarchy.attribute_type == 'interval':
        ret.append(value)
        for generalization in hierarchy.attribute_generalization:
            intervals = generalization.interval
            # This interval should never have less than 2 items

            # By the privacy policy standards, the interval will
            # always be of type [(less_or_equal),
            # (more-less_or_equal), ..., (more)].  This makes it
            # completely unnecessary to parse the symbols and do
            # complex comparison chains, as we can simply use list
            # bisection
            bisect_list = []
            for interval in intervals:
                i = interval.strip('<=>')
                if '-' in i:
                    i = i.split('-')[1]
                bisect_list.append(i)
            ret.append(intervals[bisect.bisect_left(bisect_list[:-1], value)])
    elif hierarchy.attribute_type == 'regex':
        ret.append(value)
        # By the privacy policy standards, there will be a single
        # entry in attribute_generalization.  Each consecutive regex
        # represents a further level of anonymization
        regexes = hierarchy.attribute_generalization[0].regex
        ret.extend([re.sub(p, '*', value) for p in regexes])

    elif hierarchy.attribute_type == 'static':
        # By the privacy policy standards, there will be one entry in
        # attribute_generalization per attribute.  This code searches
        # for a valid generalization (one whose first, non-anonymized
        # value is equal to the attribute's current value), and uses
        # it.
        for att_gen in hierarchy.attribute_generalization:
            gen = att_gen.generalization
            # There should be at least one generalization available
            if gen[0] == value:
                ret += gen
                break
    return ret
