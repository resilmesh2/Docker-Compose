# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from datetime import date

from pydantic import Field
from anonymizer.models.base import Model


VERSION = '1'


class EventSeverity(Model):
    high: int
    medium: int
    low: int


class EventSummary(Model):
    publisher: str
    start_date: date = Field(alias='startDate')
    end_date: date = Field(alias='endDate')
    event_types: list[str] = Field(alias='eventTypes')
    tags: list[str]
    severity: EventSeverity
