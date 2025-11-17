# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


class ReadsFromPolicies(ABC):
    @abstractmethod
    def init_policies(self, policies: dict):
        ...


@dataclass
class Result:
    success: bool
    result: Any
