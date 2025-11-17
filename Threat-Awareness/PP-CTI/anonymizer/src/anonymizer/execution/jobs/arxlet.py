# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from abc import ABC, abstractmethod
from collections.abc import Sequence
from json import loads
from types import SimpleNamespace
from typing import TYPE_CHECKING, override

from anonymizer.clients import ClientError
from anonymizer.clients.arxlet import ARXletClient
from anonymizer.config import config, log
from anonymizer.execution.jobs import (
    AnonymizingJob,
    GeneratorJob,
    JobError,
)
from anonymizer.models import arxlet as arxlet_model
from anonymizer.models import data_model, policies

if TYPE_CHECKING:
    from anonymizer.clients.context import ContextClient

TYPE_ANONYMIZABLE_BY_ARXLET = 'arxlet:anonymizable'


class ARXletJob(AnonymizingJob):
    """Abstract class for ARXlet-related jobs to inherit from.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    TYPE_ANONYMIZABLE = TYPE_ANONYMIZABLE_BY_ARXLET

    PARAM_URLA = 'arxlet_url'

    def __init__(self,
                 name: str,
                 env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None):
        super().__init__(name, env, args, generator)

    def prepare_attributes(self,
                           attributes: list[data_model.Attribute],
                           h: policies.HierarchyAttribute,
                           ) -> list[arxlet_model.AttributeData]:
        """Transform Anonymizer Attributes into ARXlet data."""
        ret: list[arxlet_model.AttributeData] = []
        for att in attributes:
            hierarchies = policies.get_hierarchy_values(att.value, h)
            attribute_data = arxlet_model.AttributeData(
                value=att.value,
                hierarchies=hierarchies,
            )
            ret.append(attribute_data)
        return ret

    def prepare_objects(self,
                        objects: list[data_model.Object],
                        h: policies.HierarchyObject,
                        *valid_attributes: str,
                        ) -> list[arxlet_model.ObjectData]:
        """Transform Anonymizer Objects into ARXlet data."""
        ret = []
        for obj in objects:
            attributes = []
            hierarchies = []
            for attribute_name in valid_attributes:
                # Get the attribute hierarchy from inside the object
                # hierarchy.
                att_h = None
                for plausible_att_h in h.attribute_hierarchies:
                    if plausible_att_h.attribute_name == attribute_name:
                        att_h = plausible_att_h
                        break
                # att_h should always exist

                # Extract the Anonymizer Attribute from the Anonymizer
                # Object
                tmp = self.extract_attributes(obj.value, attribute_name)
                # Transform it into an ARXlet AttributeData (for the
                # hierarchy it will contain)
                tmp2 = self.prepare_attributes(tmp, att_h)
                # _tmp2 should always contain a single element only
                # (there can't be multiple attributes with the same
                # name in an object)

                tmp_a = arxlet_model.Attribute(type=attribute_name,
                                            value=tmp2[0].value)
                tmp_h = arxlet_model.Hierarchy(type=attribute_name,
                                            values=tmp2[0].hierarchies)
                attributes.append(tmp_a)
                hierarchies.append(tmp_h)

            ret.append(arxlet_model.ObjectData(values=attributes,
                                               hierarchies=hierarchies))
        return ret

    def update_components(self,
                          data: Sequence[data_model.Component],
                          values: Sequence,
                          *type_filter: str,
                          ):
        """Modify Anonymizer Components based on a list of new values.

        The lists are assumed to be in the same order and have the
        same length - an Attribute will map to a string, and an Object
        will map to a list.  If included, the optional type_filter
        parameter will specify what Components to ignore from all
        Object's inner Components.

        """
        # Both lists should be the same length
        for i, data_point in enumerate(data):
            value_point = values[i]
            if isinstance(data_point, data_model.Attribute):
                # value_point should always be an instance of str
                data_point.value = value_point
            elif isinstance(data_point, data_model.Object):
                # value_point should always be an instance of list
                data_filtered = data_point.types_get(*type_filter)
                self.update_components(data_filtered,
                                       value_point,
                                       *type_filter)
            else:
                message = f'Unknown component while updating: {data_point}'
                raise JobError(message)


class FromPrivacyPolicy(GeneratorJob):
    """Anonymize using a privacy policy.

    Applies the PETs specified in the privacy policy to their
    corresponding Attributes and Objects.  This job requires the
    privacy policy and hierarchy policy to have been previously parsed
    by another job.

    - privacy_policy_location
    - `str`

    The location of the privacy policy.

    - hierarchy_policy_location
    - `str`

    The location of the hierarchy policy.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_LOCP = 'privacy_policy_location'
    PARAM_LOCH = 'hierarchy_policy_location'
    PARAM_URLA = 'arxlet_url'

    def __init__(self, name:
                 str, env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None):
        super().__init__(name, env, args, generator)

    @override
    async def generate(self, **kwargs) -> list[AnonymizingJob]:
        self.verify_parameters(kwargs, self.PARAM_LOCP, self.PARAM_LOCH)
        # Prepare variables from kwargs and env
        url = kwargs.get(self.PARAM_URLA,
                         config.services.arxlet.url.unicode_string())
        privacy_policy = self.get_from_env(kwargs[self.PARAM_LOCP],
                                           policies.PrivacyPolicy)
        hierarchy_policy = self.get_from_env(kwargs[self.PARAM_LOCH],
                                             policies.HierarchyPolicy)

        ret = []

        # Extract policy PETs
        all_pets = []
        attribute_list = []
        object_list = []
        k_map = []
        for att_policy in privacy_policy.attributes:
            for pet in att_policy.pets:
                try:
                    pet_parsed = arxlet_model.pet_from_scheme(
                        pet.scheme,
                        pet.metadata.model_dump(),
                        att_policy.name,
                    )
                    all_pets.append(pet_parsed)
                except TypeError:
                    log.info('Job "%s": Unknown ARXlet PET scheme "%s", '
                             'skipping',
                             self.name,
                             pet.scheme)
                    continue
            attribute_list.append(att_policy.name)

        for template in privacy_policy.templates:
            k_anon_count = 0
            sensitive = set()
            pets = []

            for att_policy in template.attributes:
                for att_policy_pet in att_policy.pets:
                    try:
                        tmp = arxlet_model.pet_from_scheme(
                            att_policy_pet.scheme,
                            att_policy_pet.metadata.model_dump(),
                            att_policy.name,
                        )
                    except TypeError:
                        log.info('Job "%s": Unknown ARXlet PET scheme "%s", '
                                 'skipping',
                                 self.name,
                                 att_policy_pet.scheme)
                        continue
                    # If multiple attributes have k-anonymity, only
                    # include one
                    if arxlet_model.SCHEME_KANON in tmp.scheme:
                        k_anon_count = k_anon_count + 1
                        sensitive |= {att_policy.name}
                        if k_anon_count > 1:
                            # Do not append to PET list
                            continue
                        pets.append(tmp)
            object_item = {
                'type': template.name,
                'values': list(sensitive),
            }
            object_list.append(object_item)

            if template.k_map:
                # Look up hierarchy
                hierarchy = None
                for h in hierarchy_policy.hierarchy_objects:
                    if h.misp_object_template == template.name:
                        hierarchy = h
                        break
                if hierarchy is None:
                    msg = f'No hierarchy for object "{template.name}"'
                    raise JobError(msg)
                # Apply k-map only
                k_map.append({
                    'obj': object_item,
                    'k': template.k,
                    'hierarchy': hierarchy,
                })
            else:
                # Apply PETs only

                all_pets.extend(pets)

        # Create FromPets job
        args = {
            FromPets.PARAM_PETS: all_pets,
            FromPets.PARAM_ATTS: attribute_list,
            FromPets.PARAM_OBJS: object_list,
            FromPets.PARAM_ATTH: hierarchy_policy.hierarchy_attributes,
            FromPets.PARAM_OBJH: hierarchy_policy.hierarchy_objects,
            FromPets.PARAM_URLA: url,
        }
        job = FromPets(name='apply_pets', args=args, generator=self)
        ret.append(job)

        # Create KMap job(s)
        for k_map_info in k_map:
            args = {
                KMap.PARAM_KVAL: k_map_info['k'],
                KMap.PARAM_OBTS: k_map_info['obj'],
                KMap.PARAM_OBHS: k_map_info['hierarchy'],
                KMap.PARAM_URLA: url,
            }
            object_name = k_map_info['obj']['type']
            job = KMap(name=f'apply_k_map_{object_name}',
                       args=args, generator=self)
            ret.append(job)

        return ret


class FromPets(ARXletJob):
    """Anonymize based on a collection of PETs.

    - pets
    - `list[dict | str | anonymizer.models.arxlet.Pet]`

    The PETs to apply.  Each entry should be a `string`/`dict`
    representation of the `anonymizer.models.arxlet.Pet` class, or an
    instance of it.

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.  Can be empty.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized. Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the quasi-identifying/sensitive attributes the object
    has)

    - attribute_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyAttribute]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyAttribute` class, or
    instances of it.  This field will contain a `HierarchyAttribute`
    object for each entry in the "attributes" field.

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """  # noqa: W505

    PARAM_PETS = 'pets'
    PARAM_ATTS = 'attributes'
    PARAM_OBJS = 'objects'
    PARAM_OBJH = 'object_hierarchies'
    PARAM_ATTH = 'attribute_hierarchies'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_PETS,
                               self.PARAM_ATTS,
                               self.PARAM_OBJS,
                               self.PARAM_ATTH,
                               self.PARAM_OBJH)
        # Prepare variables from kwargs and env
        data = self.anonymizable_components()
        pets = kwargs[self.PARAM_PETS]
        attributes: list[str] = kwargs[self.PARAM_ATTS]
        objects: list[dict] = kwargs[self.PARAM_OBJS]
        att_hierarchies: list[dict] = kwargs[self.PARAM_ATTH]
        obj_hierarchies: list[dict] = kwargs[self.PARAM_OBJH]
        url = kwargs.get(self.PARAM_URLA,
                         config.services.arxlet.url.unicode_string())

        # Extract PETs
        pets_to_apply = []
        for pet in pets:
            # We don't use parse_arg_as() because model_validate()
            # doesn't seem to be able to correctly parse metadata into
            # the correct class
            if isinstance(pet, arxlet_model.Pet):
                pet_parsed = pet
            elif isinstance(pet, dict):
                try:
                    pet_parsed = arxlet_model.pet_from_scheme(
                        pet['scheme'],
                        pet['metadata'],
                        pet['metadata'].get('sensitive', None),
                        pet['metadata'].get('context', None),
                    )
                except TypeError:
                    log.info('Job "%s": Unknown ARXlet PET scheme "%s", '
                             'skipping',
                             self.name,
                             pet['scheme'])
                    continue
            elif isinstance(pet, str):
                pet_dict = loads(pet)
                try:
                    pet_parsed = arxlet_model.pet_from_scheme(
                        pet_dict['scheme'],
                        pet_dict['metadata'],
                        pet_dict['metadata'].get('sensitive', None),
                        pet_dict['metadata'].get('context', None),
                    )
                except TypeError:
                    log.info('Job "%s": Unknown ARXlet PET scheme "%s", '
                             'skipping',
                             self.name,
                             pet_dict['scheme'])
                    continue
            else:
                msg = 'Pet is not string, dict or instance of Pet class'
                raise JobError(msg)
            pets_to_apply.append(pet_parsed)
        log.debug('Job "%s": Prepared %s PETs', self.name, len(pets_to_apply))

        # If there are no PETs, finish
        if len(pets_to_apply) == 0:
            log.info('Job "%s": No PETs to apply', self.name)
            return

        # Apply PETs to attributes
        for _att in attributes:
            ah: policies.HierarchyAttribute | None = None
            for att_h in att_hierarchies:
                tmp = self.parse_arg_as(att_h, policies.HierarchyAttribute)
                if tmp.attribute_name == _att:
                    ah = tmp
            if ah is None:
                msg = f'No hierarchy for attribute "{_att}"'
                raise JobError(msg)
            eatts = self.extract_attributes(data,
                                         TYPE_ANONYMIZABLE_BY_ARXLET,
                                         _att)
            atts = self.prepare_attributes(eatts, ah)
            log.debug('Job "%s": Prepared %s attributes of type %s',
                      self.name, len(atts), _att)
            if len(atts) == 0:
                continue
            try:
                async with ARXletClient(url) as client:
                    resp = await client.anonymize_attributes(atts,
                                                             pets_to_apply)
                    if resp is None:
                        msg = 'ARXlet request failed'
                        raise JobError(msg)
                    self.update_components(eatts, resp, self.TYPE_ANONYMIZABLE)
            except ClientError as e:
                msg = 'Client exception raised'
                raise JobError(msg) from e

        # Apply PETs to objects
        for _obj in objects:
            o_type = _obj['type']
            o_vals = _obj['values']
            oh: policies.HierarchyObject | None = None
            for obj_h in obj_hierarchies:
                tmp = self.parse_arg_as(obj_h, policies.HierarchyObject)
                if tmp.misp_object_template == o_type:
                    oh = tmp
            if oh is None:
                msg = f'No hierarchy for object "{o_type}"'
                raise JobError(msg)
            eatts = self.extract_objects(data,
                                      TYPE_ANONYMIZABLE_BY_ARXLET,
                                      o_type)

            # Prune all non-sensitive attributes from the Object.  To
            # do this we create a new list with new Objects, but the
            # inner Attributes are the same.
            l_pruned = []
            for o in eatts:
                value_p = o.types_search(*o_vals)
                l_pruned.append(
                    data_model.Object(type=o.type, name=o.name, value=value_p),
                )

            objs = self.prepare_objects(l_pruned, oh, *o_vals)
            log.debug('Job "%s": Prepared %s objects of type %s',
                      self.name, len(objs), o_type)
            if len(objs) == 0:
                continue
            try:
                async with ARXletClient(url) as client:
                    obj_resp = await client.anonymize_objects(objs,
                                                              pets_to_apply)
                    if obj_resp is None:
                        msg = 'ARXlet request failed'
                        raise JobError(msg)
            except ClientError as e:
                msg = 'Client exception raised'
                raise JobError(msg) from e

            # obj_resp and _l_pruned should be the same length

            # In order for update_components() to work, we have to
            # transform the response so it only contains lists or
            # strings (in this case, only strings)
            formatted_resp = []
            for o in obj_resp:
                formatted_resp.append(
                    [v.value for v in o],
                )

            self.update_components(l_pruned,
                                   formatted_resp,
                                   self.TYPE_ANONYMIZABLE)


class KAnonymity(FromPets):
    """Apply k-anonymity..

    - k
    - `int`

    The k value

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.  Can be empty.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized.  Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the quasi-identifying attributes the object has).

    - attribute_hierarchies
    - `list[dict]`

    Contains dictionary representations of the
    `anonymizer.models.policies.HierarchyAttribute` class. This field
    will contain a `HierarchyAttribute` object for each entry in the
    "attributes" field.

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_KVAL = 'k'
    PARAM_ATTS = 'attributes'
    PARAM_OBJS = 'objects'
    PARAM_OBJH = 'object_hierarchies'
    PARAM_ATTH = 'attribute_hierarchies'

    @override
    async def run(self, **kwargs) -> None:
        self.verify_parameters(kwargs,
                               self.PARAM_KVAL)
        k = kwargs[self.PARAM_KVAL]

        # The only PET to apply
        pet_k_anon = arxlet_model.Pet(scheme=arxlet_model.SCHEME_KANON,
                                      metadata=arxlet_model.KAnonMetadata(k=k))

        # Rely on superclass
        new_kwargs = {self.PARAM_PETS: pet_k_anon.model_dump()}
        new_kwargs.update(kwargs)
        return await super().run(**new_kwargs)


class _SensitivePETJob(FromPets, ABC):
    """Apply a PET to a sensitive Attribute.

    - sensitive
    - `str`

    The Attribute type to be marked as sensitive.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized.  Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the attribute types the object has, each object can
    only contain one attribute per attribute type).

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_SENS = 'sensitive'
    PARAM_OBJS = 'objects'
    PARAM_OBJH = 'object_hierarchies'

    @override
    async def run(self, **kwargs) -> None:
        self.verify_parameters(kwargs, self.PARAM_SENS)
        pet = self.get_pet(**kwargs)
        # Rely on FromPets
        new_kwargs = {self.PARAM_PETS: pet}
        new_kwargs.update(kwargs)
        return await super().run(**new_kwargs)

    @abstractmethod
    def get_pet(self, **kwargs) -> arxlet_model.Pet:
        ...


class DistinctLDiversity(_SensitivePETJob):
    """Apply distinct l-diversity.

    - l
    - `int`

    The l value.

    - sensitive
    - `str`

    The attribute type to be marked as sensitive.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized.  Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the attribute types the object has, each object can
    only contain one attribute per attribute type).

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_LVAL = 'l'

    @override
    def get_pet(self, **kwargs) -> arxlet_model.Pet:
        self.verify_parameters(kwargs, self.PARAM_LVAL)
        value_l = kwargs[self.PARAM_LVAL]
        meta = arxlet_model.LDivMetadata(attribute=kwargs[self.PARAM_SENS],
                                         l=value_l)
        return arxlet_model.Pet(scheme=arxlet_model.SCHEME_DLDIV,
                               metadata=meta)


class EntropyLDiversity(_SensitivePETJob):
    """Apply entropy l-diversity.

    - l
    - `int`

    The l value.

    - sensitive
    - `str`

    The attribute type to be marked as sensitive.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized.  Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the attribute types the object has, each object can
    only contain one attribute per attribute type).

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_LVAL = 'l'

    @override
    def get_pet(self, **kwargs) -> arxlet_model.Pet:
        self.verify_parameters(kwargs, self.PARAM_LVAL)
        value_l = kwargs[self.PARAM_LVAL]
        meta = arxlet_model.LDivMetadata(attribute=kwargs[self.PARAM_SENS],
                                         l=value_l)
        return arxlet_model.Pet(scheme=arxlet_model.SCHEME_ELDIV,
                               metadata=meta)


class RecursiveCLDiversity(_SensitivePETJob):
    """Apply recursive (c, l)-diversity.

    - l
    - `int`

    The l value.

    - c
    - `int`

    The c value.

    - sensitive
    - `str`

    The attribute type to be marked as sensitive.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized.  Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the attribute types the object has, each object can
    only contain one attribute per attribute type).

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_LVAL = 'l'
    PARAM_CVAL = 'c'

    @override
    def get_pet(self, **kwargs) -> arxlet_model.Pet:
        self.verify_parameters(kwargs, self.PARAM_LVAL, self.PARAM_CVAL)
        value_l = kwargs[self.PARAM_LVAL]
        value_c = kwargs[self.PARAM_CVAL]
        meta = arxlet_model.CLDivMetadata(attribute=kwargs[self.PARAM_SENS],
                                          l=value_l,
                                          c=value_c)
        return arxlet_model.Pet(scheme=arxlet_model.SCHEME_RLDIV,
                               metadata=meta)


class HierarchicalTCloseness(_SensitivePETJob):
    """Apply hierarchical distance t-closeness.

    - t
    - `float`

    The t value.

    - sensitive
    - `str`

    The attribute type to be marked as sensitive.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized.  Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the attribute types the object has, each object can
    only contain one attribute per attribute type).

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_TVAL = 't'

    @override
    def get_pet(self, **kwargs) -> arxlet_model.Pet:
        self.verify_parameters(kwargs, self.PARAM_TVAL)
        value_t = kwargs[self.PARAM_TVAL]
        meta = arxlet_model.TCloMetadata(attribute=kwargs[self.PARAM_SENS],
                                         t=value_t)
        return arxlet_model.Pet(scheme=arxlet_model.SCHEME_HTCLO,
                               metadata=meta)


class OrderedTCloseness(_SensitivePETJob):
    """Apply ordered distance t-closeness.

    - t
    - `float`

    The t value.

    - sensitive
    - `str`

    The attribute type to be marked as sensitive.

    - objects
    - `list[dict[str, str | list[str]]]`

    The object type(s) to be anonymized.  Each item in the list shall
    contain a "type" string (the object type), and a "values" list of
    strings (all the attribute types the object has, each object can
    only contain one attribute per attribute type).

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyObject` class, or instances
    of it.  This field will contain a hierarchy for each entry in the
    "objects" field.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_TVAL = 't'

    @override
    def get_pet(self, **kwargs) -> arxlet_model.Pet:
        self.verify_parameters(kwargs, self.PARAM_TVAL)
        value_t = kwargs[self.PARAM_TVAL]
        meta = arxlet_model.TCloMetadata(attribute=kwargs[self.PARAM_SENS],
                                         t=value_t)
        return arxlet_model.Pet(scheme=arxlet_model.SCHEME_OTCLO,
                               metadata=meta)


class KMap(FromPets):
    """Apply k-map to anonymizable Objects.

    - k
    - `int`

    The k value.

    - object
    - `dict`

    The object type to be anonymized.  The `dict` shall contain a
    "type" string (the object type), and a "values" list of strings
    (all the quasi-identifying attributes the object has).

    - object_hierarchy
    - `dict`

    Contains a `dict` representation of the
    `anonymizer.models.policies.HierarchyObject` class.

    - arxlet_url (Optional)
    - `str`

    An alternative URL to send the ARXlet requests to.
    """

    PARAM_KVAL = 'k'
    PARAM_OBTS = 'object'
    PARAM_OBHS = 'object_hierarchy'

    @override
    async def run(self, **kwargs) -> None:
        self.verify_parameters(kwargs,
                               self.PARAM_KVAL,
                               self.PARAM_OBTS,
                               self.PARAM_OBHS)
        k = kwargs[self.PARAM_KVAL]
        objectt = kwargs[self.PARAM_OBTS]
        hierarchy = kwargs[self.PARAM_OBHS]
        url = kwargs.get(self.PARAM_URLA,
                         config.services.arxlet.url.unicode_string())

        o_type = objectt['type']
        o_vals = objectt['values']

        # Extract context
        context_client: ContextClient = self.request().app.ctx.context_client
        results = await context_client.lookup([o_type])
        context = []
        count = 0
        for req in results:
            objs = self.extract_objects(req.data,
                                        TYPE_ANONYMIZABLE_BY_ARXLET,
                                        o_type)
            listt = self.prepare_objects(objs, hierarchy, *o_vals)
            context.append(listt)
            count = count + len(listt)

        log.debug('Job "%s": Obtained %s Objects from context database',
                  self.name,
                  count)
        # The only PET to apply
        k_map_metadata = arxlet_model.KMapMetadata(
            k=k,
            context=context,

        )
        pet_k_map = arxlet_model.Pet(scheme=arxlet_model.SCHEME_KMAP,
                                     metadata=k_map_metadata)

        # Rely on FromPets

        new_kwargs = {
            FromPets.PARAM_PETS: [pet_k_map.model_dump()],
            FromPets.PARAM_OBJS: [objectt],
            FromPets.PARAM_OBJH: [hierarchy],
            FromPets.PARAM_ATTS: [],
            FromPets.PARAM_ATTH: [],
            FromPets.PARAM_URLA: url,
        }
        return await super().run(**new_kwargs)
