# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from typing import override
from uuid import uuid4

from anonymizer.execution.jobs.arxlet import TYPE_ANONYMIZABLE_BY_ARXLET
from anonymizer.execution.jobs.flaskdp import TYPE_ANONYMIZABLE_BY_FLASKDP
from anonymizer.execution.jobs.local import TYPE_ANONYMIZABLE_BY_LOCAL
from anonymizer.models import data_model, misp
from anonymizer.transformers import Transformer

REQUEST_TYPES = set()
OBJECT_TYPES = {TYPE_ANONYMIZABLE_BY_ARXLET,
                TYPE_ANONYMIZABLE_BY_FLASKDP,
                TYPE_ANONYMIZABLE_BY_LOCAL}
ATTRIBUTE_TYPES = {TYPE_ANONYMIZABLE_BY_ARXLET,
                   TYPE_ANONYMIZABLE_BY_FLASKDP,
                   TYPE_ANONYMIZABLE_BY_LOCAL}


def attribute_types(att: misp.Attribute) -> set[str]:
    ret = {data_model.DEFAULT_ATTRIBUTE_TYPE}
    ret |= ATTRIBUTE_TYPES
    ret |= {att.object_relation}
    return ret


def object_types(obj: misp.Object) -> set[str]:
    ret = {data_model.DEFAULT_OBJECT_TYPE}
    ret |= OBJECT_TYPES
    ret |= {obj.name}
    return ret


def request_types(_: misp.Event) -> set[str]:
    ret = set()  # Requests have no default type
    ret |= REQUEST_TYPES
    return ret


def generate_object_name(obj: misp.Object) -> str:
    if obj.uuid is None:
        obj.uuid = str(uuid4())
    return f'{obj.name}-{obj.uuid}'


def generate_attribute_name(att: misp.Attribute) -> str:
    if att.uuid is None:
        att.uuid = str(uuid4())
    return f'{att.object_relation}-{att.uuid}'


class MispTransformer(Transformer[misp.EventAnon]):
    @override
    def get_body_type(self) -> type[misp.EventAnon]:
        return misp.EventAnon

    @override
    def transform(self, request_body: misp.EventAnon) -> data_model.Request:
        event = request_body.event

        if event.uuid is None:
            event.uuid = str(uuid4())

        data = []
        for obj in event.objects:
            atts = []
            for att in obj.attributes:
                a = data_model.Attribute(name=generate_attribute_name(att),
                                         type=attribute_types(att),
                                         value=str(att.value))
                atts.append(a)
            o = data_model.Object(name=generate_object_name(obj),
                                  type=object_types(obj),
                                  value=atts)
            data.append(o)
        for att in event.attributes:
            a = data_model.Attribute(name=generate_attribute_name(att),
                                     type=attribute_types(att),
                                     value=str(att.value))
            data.append(a)
        return data_model.Request(type=request_types(event),
                                  data=data)

    @override
    def update(self,
               request_body: misp.EventAnon,
               data: data_model.Request,
               ) -> bool:
        updated = False
        event = request_body.event
        for obj in event.objects:
            # Get data
            obj_data: data_model.Object | None = None
            obj_types = object_types(obj)
            for _obj in data.types_get(*obj_types):
                if (isinstance(_obj, data_model.Object)
                    and _obj.name == generate_object_name(obj)):
                    obj_data = _obj
                    break
            if obj_data is None:
                msg = (f'Unable to find data for object "{obj.name}" with '
                       f'UUID "{obj.uuid}"')
                raise ValueError(msg)
            for att in obj.attributes:
                # Get data
                att_data: data_model.Attribute | None = None
                att_types = attribute_types(att)
                for _att in obj_data.types_get(*att_types):
                    if (isinstance(_att, data_model.Attribute)
                        and _att.name == generate_attribute_name(att)):
                        att_data = _att
                        break
                if att_data is None:
                    msg = ('Unable to find data for object attribute '
                           f'"{att.object_relation}" with UUID "{att.uuid}"')
                    raise ValueError(msg)
                if att.value != att_data.value:
                    updated = True
                    att.value = att_data.value
        for att in event.attributes:
            # Get data
            att_data: data_model.Attribute | None = None
            att_types = attribute_types(att)
            for _att in data.types_get(*att_types):
                if (isinstance(_att, data_model.Attribute)
                    and _att.name == generate_attribute_name(att)):
                    att_data = _att
                    break
            if att_data is None:
                msg = ('Unable to find data for attribute '
                       f'"{att.object_relation}" with UUID "{att.uuid}"')
                raise ValueError(msg)
            if att.value != att_data.value:
                updated = True
                att.value = att_data.value
        return updated

    @override
    def snapshot(self, request_body: misp.EventAnon) -> dict:
        ret = {}

        # Add a unique identifier to pevent losing identical audits
        ret['uuid'] = str(uuid4())

        # Event tags: list of strings
        ret['tags'] = [t.id for t in request_body.event.tags]

        # Event severity: int
        ret['severity'] = request_body.event.threat_level_as_int()

        # Event date: str
        ret['date'] = request_body.event.date.strftime('%Y-%m-%d')

        # Event published?: bool
        ret['published'] = False

        # Event uploaded?: bool
        ret['uploaded'] = False

        # Event type: str
        for attribute in request_body.event.attributes:
            if attribute.object_relation == 'event_type':
                ret['event_type'] = attribute.value
                break

        # Additional fields
        if request_body.audit is not None:
            ret.update(request_body.audit)

        return ret
