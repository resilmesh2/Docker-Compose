# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations

from abc import ABC, abstractmethod
from functools import reduce
from hashlib import sha256
from json import dumps
from typing import TYPE_CHECKING, override

from anonymizer.config import log
from anonymizer.models.base import Model

if TYPE_CHECKING:
    from collections.abc import Callable

DEFAULT_ATTRIBUTE_TYPE = 'attribute'
DEFAULT_OBJECT_TYPE = 'object'

FIELD_MODEL_TYPE = '#modeltype'
FIELD_TYPE_ATT = 'attribute'
FIELD_TYPE_OBJ = 'object'
FIELD_TYPE_REQ = 'request'


class _HasType(Model, ABC):
    type: set[str] = set()  # noqa: RUF012

    def type_is(self, *t: str) -> bool:
        return all(_t in self.type for _t in t)

    def type_merge(self, *t: str):
        self.type = self.type | set(t)

    def type_remove(self, *t: str):
        self.type = self.type & set(t)


class _HasDataWithTypes(Model, ABC):
    @abstractmethod
    def _get_data(self) -> list[Component]:
        ...

    def _types(self, function: Callable[[set, set], set]) -> set[str]:
        return reduce(function, (a.type for a in self._get_data()))

    def types_one(self) -> set[str]:
        """Get the set of all types fulfilled by 1+ subcomponents.

        :return: the resulting set from joining all types from this
        component's value(s).

        :rtype set:
        """
        return self._types(lambda a, b: a | b)

    def types_all(self) -> set[str]:
        """Get the set of types fulfilled by all subcomponents.

        :return: the resulting set from interesecting all types from
        this component's value(s).

        :rtype set:
        """
        return self._types(lambda a, b: a & b)

    def types_count(self) -> dict[str, int]:
        """Get the map of types and their subcomponent count.

        :return: a dictionary containing all types from this
        component's value(s) and the amount of them that possess it.

        :rtype dict[str, int]:
        """
        ret = {}
        for att in self._get_data():
            for t in att.type:
                ret[t] = ret[t] + 1 if t in ret else 1
        return ret

    def types_get(self, *t: str) -> list[Component]:
        """Get the list of subcomponents fulfilling all types.

        :rtype list[Component]:
        """
        return [d
                for d in self._get_data()
                if all(d.type_is(_t) for _t in t)]

    def types_search(self, *t: str) -> list[Component]:
        """Get the list of subcomponents fulfilling any type.

        :rtype list[Component]:
        """
        return [d
                for d in self._get_data()
                if any(d.type_is(_t) for _t in t)]

    def types_remove(self, *t: str) -> list[Component]:
        """Get the list of subcomponents not fulfilling all types.

        :rtype list[Component]:
        """
        return [d
                for d in self._get_data()
                if all(not d.type_is(_t) for _t in t)]

    def types_prune(self, *t: str) -> list[Component]:
        """Get the list of subcomponents not fulfilling any type.

        :rtype list[Component]:
        """
        return [d
                for d in self._get_data()
                if any(not d.type_is(_t) for _t in t)]


class Component(_HasType):
    name: str
    value: str | list[Component]


class Attribute(Component):
    type: set[str] = {DEFAULT_ATTRIBUTE_TYPE}  # noqa: RUF012
    value: str = ''

    @classmethod
    def to_dict(cls, att: Attribute) -> dict:
        return {
            FIELD_MODEL_TYPE: FIELD_TYPE_ATT,
            'name': att.name,
            'type': sorted(att.type),
            'value': att.value,
        }

    @classmethod
    def from_dict(cls, att: dict) -> Attribute:
        required = [FIELD_MODEL_TYPE, 'name', 'type', 'value']
        if any(s not in att for s in required):
            log.error('Unable to validate Attribute dict: missing fields')
            log.debug('Dict: %s', att)
            msg = 'Missing fields'
            raise ValueError(msg)
        if att[FIELD_MODEL_TYPE] != FIELD_TYPE_ATT:
            log.error('Unable to validate Attribute dict: not an Attribute')
            log.debug('Expected type: "%s"', FIELD_TYPE_ATT)
            log.debug('Obtained type: "%s"', att[FIELD_MODEL_TYPE])
            msg = 'Not an Attribute'
            raise ValueError(msg)
        return Attribute(name=att['name'],
                         type=att['type'],
                         value=att['value'])


class Object(Component, _HasDataWithTypes):
    type: set[str] = {DEFAULT_OBJECT_TYPE}  # noqa: RUF012
    value: list[Component]

    @classmethod
    def to_dict(cls, obj: Object) -> dict:
        value = []
        for v in obj.value:
            if isinstance(v, Object):
                value.append(Object.to_dict(v))
            elif isinstance(v, Attribute):
                value.append(Attribute.to_dict(v))
            else:
                msg = 'Not an Object or Attribute'
                raise ValueError(msg)
        return {
            FIELD_MODEL_TYPE: FIELD_TYPE_OBJ,
            'name': obj.name,
            'type': sorted(obj.type),
            'value': value,
        }

    @classmethod
    def from_dict(cls, obj: dict) -> Object:
        required = ['name', 'type', 'value']
        if any(s not in obj for s in required):
            log.error('Unable to validate Object dict: missing fields')
            log.debug('Dict: %s', obj)
            msg = 'Unable to validate object'
            raise ValueError(msg)
        if obj[FIELD_MODEL_TYPE] != FIELD_TYPE_OBJ:
            log.error('Unable to validate Object dict: not an Objct')
            log.debug('Expected type: "%s"', FIELD_TYPE_OBJ)
            log.debug('Obtained type: "%s"', obj[FIELD_MODEL_TYPE])
            msg = 'Not an Object'
            raise ValueError(msg)
        value = []
        for v in obj['value']:
            if v[FIELD_MODEL_TYPE] == FIELD_TYPE_OBJ:
                value.append(Object.from_dict(v))
            elif v[FIELD_MODEL_TYPE] == FIELD_TYPE_ATT:
                value.append(Attribute.from_dict(v))
            else:
                msg = 'Not an Object or Attribute'
                raise ValueError(msg)
        return Object(name=obj['name'],
                      type=obj['type'],
                      value=value)

    @override
    def _get_data(self) -> list[Component]:
        return self.value


class Request(_HasType, _HasDataWithTypes):
    data: list[Component] = []  # noqa: RUF012

    @classmethod
    def to_dict(cls, req: Request) -> dict:
        data = []
        for d in req.data:
            if isinstance(d, Object):
                data.append(Object.to_dict(d))
            elif isinstance(d, Attribute):
                data.append(Attribute.to_dict(d))
            else:
                msg = 'Not an Object or Attribute'
                raise ValueError(msg)
        return {
            FIELD_MODEL_TYPE: FIELD_TYPE_REQ,
            'type': sorted(req.type),
            'data': data,
        }

    @classmethod
    def from_dict(cls, req: dict) -> Request:
        required = ['type', 'data']
        if any(s not in req for s in required):
            log.error('Unable to validate Request dict: missing fields')
            log.debug('Dict: %s', req)
            msg = 'Unable to validate object'
            raise ValueError(msg)
        if req[FIELD_MODEL_TYPE] != FIELD_TYPE_REQ:
            log.error('Unable to validate Request dict: not a Request')
            log.debug('Expected type: "%s"', FIELD_TYPE_REQ)
            log.debug('Obtained type: "%s"', req[FIELD_MODEL_TYPE])
            msg = 'Not a Request'
            raise ValueError(msg)
        data = []
        for d in req['data']:
            if d[FIELD_MODEL_TYPE] == FIELD_TYPE_OBJ:
                data.append(Object.from_dict(d))
            elif d[FIELD_MODEL_TYPE] == FIELD_TYPE_ATT:
                data.append(Attribute.from_dict(d))
            else:
                msg = 'Not an Object or Attribute'
                raise ValueError(msg)
        return Request(type=req['type'], data=data)

    @override
    def _get_data(self) -> list[Component]:
        return self.data

    def all_objects(self) -> bool:
        """Check if all components are Objects.

        :return: `True` if all data in this Request are Objects,
        `False` otherwise.

        :rtype bool:

        """
        return all(isinstance(d, Object) for d in self.data)

    def all_attributes(self) -> bool:
        """Check if all components are Attributes.

        :return: `True` if all data in this Request are Attributes,
        `False` otherwise.

        :rtype bool:
        """
        return all(isinstance(d, Attribute) for d in self.data)

    def to_hash(self) -> str:
        hash_string = dumps(
                Request.to_dict(self),
                sort_keys=True,
            ).encode('utf-8')
        return sha256(hash_string, usedforsecurity=False).hexdigest()
