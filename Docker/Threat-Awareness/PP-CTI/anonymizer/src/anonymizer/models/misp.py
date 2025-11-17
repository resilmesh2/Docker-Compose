# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

import datetime
from enum import StrEnum
from pydantic import Field
from pymisp.mispevent import MISPEvent

from anonymizer.models.base import Model
from anonymizer.models.policies import HierarchyPolicy, PrivacyPolicy


VERSION = '2.5.9'


class ThreatLevel(StrEnum):
    HIGH = '1'
    MEDIUM = '2'
    LOW = '3'
    UNDEFINED = '4'


class Attribute(Model):
    uuid: str | None = None
    object_relation: str
    value: str | bool


class Object(Model):
    name: str
    uuid: str | None = None
    timestamp: str
    attributes: list[Attribute] = Field(alias='Attribute')


class Tag(Model):
    id: str
    name: str


class Event(Model):
    uuid: str | None = None
    date: datetime.date = datetime.date.today()
    timestamp: str = '0'
    threat_level_id: ThreatLevel
    attributes: list[Attribute] = Field(alias='Attribute', default=[])
    objects: list[Object] = Field(alias='Object', default=[])
    tags: list[Tag] = Field(alias='Tag', default=[])

    def to_misp_event(self) -> MISPEvent:
        new_event = MISPEvent()
        new_event.from_dict(**self.model_dump(by_alias=True))
        return new_event

    def get_event_type(self) -> str:
        return ('OBJECTS'
                if len(self.objects) == 0 and len(self.attributes) != 0
                else 'ATTRIBUTES')

    def threat_level_as_int(self) -> int:
        """Return an `int` representation of the threat level."""
        return int(self.threat_level_id)


class EventAnon(Model):
    event: Event = Field(alias='Event')
    privacy_policy: PrivacyPolicy = Field(alias='Privacy-policy')
    hierarchy_policy: HierarchyPolicy = Field(alias='Hierarchy-policy')
    audit: dict | None = Field(alias='Audit', default=None)


class EventMISP(Model):
    event: Event = Field(alias='Event')
