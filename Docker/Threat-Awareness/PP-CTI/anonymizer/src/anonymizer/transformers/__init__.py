# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations

from abc import ABC, abstractmethod
from types import NoneType
from typing import override

from anonymizer.config import log
from anonymizer.models.base import Model
from anonymizer.models.data_model import Request
from anonymizer.util import import_from_str

RequestBody = Model | dict | list | None


class Transformer[T: Model | dict | list | None](ABC):
    @classmethod
    def from_string(cls, transformer_type: str) -> Transformer:
        transformer_class = import_from_str(Transformer,
                                            transformer_type,
                                            'anonymizer.transformers')
        if transformer_class is None:
            log.error('Class %s is not a Transformer subclass',
                      transformer_type)
            return NoTransformer()
        return transformer_class()

    @abstractmethod
    def get_body_type(self) -> type[T]:
        """Get the expected input type.

        :return: The class this transformer expects as input: `dict`
        if the transformer expects a raw JSON object, `list` if it
        expects a raw JSON list, or `None` if it doesn't expect any
        content.

        :rtype type[T]:
        """
        ...

    @abstractmethod
    def transform(self, request_body: T) -> Request:
        """Transform a web request into an Anonymizer Request object.

        :param foreign_component: The received foreign component.
        """
        ...

    @abstractmethod
    def update(self, request_body: T, data: Request) -> bool:
        """Update a web request using an Anonymizer Request object.

        :return: `True` if any value was changed, `False` otherwise.

        :rtype bool:
        """
        ...

    @abstractmethod
    def snapshot(self, request_body: T) -> dict:
        """Generate an auditable snapshot of the web request.

        When auditing, this method is called before running the main
        pipeline.  Its purpose is to record any information from the
        request before the anonymization process is run and the
        contents potentially changed.

        :return: A `dict` containing all audit-relevant information
        contained in the web request body.  Of particular focus is
        information that will not be accessible after transforming the
        body into an Anonymizer Request.

        :rtype dict:
        """
        ...


class NoTransformer(Transformer[None]):
    @override
    def get_body_type(self) -> type[None]:
        return NoneType

    @override
    def transform(self, _: None) -> Request:
        return Request(type=set(), data=[])

    @override
    def update(self, *_) -> bool:
        return False

    def snapshot(self, *_) -> dict:
        return {}
