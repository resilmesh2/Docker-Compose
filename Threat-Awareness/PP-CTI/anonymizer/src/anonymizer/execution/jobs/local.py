# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from typing import override

import pgpy

from anonymizer.config import log
from anonymizer.execution.exceptions import JobError
from anonymizer.execution.jobs import AnonymizingJob, GeneratorJob, Job
from anonymizer.models.data_model import Attribute, Object
from anonymizer.models.policies import (
    HierarchyAttribute,
    HierarchyPolicy,
    Pet,
    PrivacyPolicy,
    get_hierarchy_values,
)

TYPE_ANONYMIZABLE_BY_LOCAL = 'local:anonymizable'


class LocalJob(AnonymizingJob):
    TYPE_ANONYMIZABLE = TYPE_ANONYMIZABLE_BY_LOCAL


class ApplyAnonymizationLevel(LocalJob):
    """Applies a certain anonymization level to Attributes.

    - level
    - `int`

    The suppression level.

    - attributes
    - `list[str]`

    The Attribute type(s) to be anonymized.  Can be empty.

    - objects
    - `list[str]`

    The top-level Object type(s) to look up Attributes in.  If empty,
    anonymizes only top-level Attributes (not inside any Object).

    - attribute_hierarchies
    - `list[dict]`

    Contains `string`/`dict` representations of the
    `anonymizer.models.policies.HierarchyAttribute` class, or
    instances of it.  This field will contain a `HierarchyAttribute`
    object for each entry in the "attributes" field.
    """

    PARAM_LEVL = 'level'
    PARAM_ATTS = 'attributes'
    PARAM_OBJS = 'objects'
    PARAM_ATTH = 'attribute_hierarchies'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_LEVL,
                               self.PARAM_ATTS,
                               self.PARAM_OBJS,
                               self.PARAM_ATTH)
        data = self.anonymizable_components()
        level = int(kwargs[self.PARAM_LEVL])
        attributes: list[str] = kwargs[self.PARAM_ATTS]
        objects: list[str] = kwargs[self.PARAM_OBJS]
        hierarchies: list = kwargs[self.PARAM_ATTH]

        log.debug('Job "%s": Applying suppression to: %s',
                  self.name,
                  attributes)
        log.debug('Job "%s": Objects to look inside of: %s',
                  self.name,
                  objects)

        # Set lookup collection
        lookup: list[Attribute] = []
        if len(objects) == 0:
            lookup.extend([a for a in data if isinstance(a, Attribute)])
        else:
            for c in data:
                if (isinstance(c, Object)
                    and any(c.type_is(t) for t in objects)):
                    lookup.extend(
                        [a for a in c.value if isinstance(a, Attribute)],
                    )

        log.debug('Job "%s": Lookup list generated with length %s',
                  self.name,
                  len(lookup))

        # Prepare hierarchy map
        hierarchy_map: dict[str, HierarchyAttribute] = {}
        for h in hierarchies:
            h_parsed = self.parse_arg_as(h, HierarchyAttribute)
            hierarchy_map[h_parsed.attribute_name] = h_parsed

        # Apply suppression
        for attribute in lookup:
            name = None
            for n in attributes:
                if attribute.type_is(n):
                    name = n
                    break
            if name is None:
                continue
            values = get_hierarchy_values(
                attribute.value,
                hierarchy_map[name],
            )
            if len(values) <= level:
                log.debug('Job "%s": Not enough generalization levels ('
                          'Expected >%s, found %s)',
                          self.name,
                          level,
                          len(values))
                msg = ('Not enough generalization levels for attribute '
                       f'{attribute.name}')
                raise JobError(msg)
            attribute.value = values[level]


class ApplyPGPEncryption(LocalJob):
    """Encrypt a collection of attributes using PGP.

    - key
    - `str`

    The PGP key used for encryption.  This corresponds to the key's
    filename, including any file extensions.

    - attributes
    - `list[str]`

    The Attribute type(s) to be anonymized.  Can be empty.

    - objects
    - `list[str]`

    The top-level Object type(s) to look up Attributes in.  If empty,
    anonymizes only top-level Attributes (not inside any Object).
    """

    PARAM_KEY = 'key'
    PARAM_ATTS = 'attributes'
    PARAM_OBJS = 'objects'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_KEY,
                               self.PARAM_ATTS,
                               self.PARAM_OBJS)
        data = self.anonymizable_components()
        key_name: str = kwargs[self.PARAM_KEY]
        attributes: list[str] = kwargs[self.PARAM_ATTS]
        objects: list[str] = kwargs[self.PARAM_OBJS]

        log.debug('Job "%s": Applying PGP encryption to: %s',
                  self.name,
                  attributes)
        log.debug('Job "%s": Objects to look inside of: %s',
                  self.name,
                  objects)
        log.debug('Job "%s": PGP key: %s',
                  self.name,
                  key_name)

        # Set lookup collection
        lookup: list[Attribute] = []
        if len(objects) == 0:
            lookup.extend([a for a in data if isinstance(a, Attribute)])
        else:
            for c in data:
                if (isinstance(c, Object)
                    and any(c.type_is(t) for t in objects)):
                    lookup.extend(
                        [a for a in c.value if isinstance(a, Attribute)],
                    )

        log.debug('Job "%s": Lookup list generated with length %s',
                  self.name,
                  len(lookup))

        # Retrieve PGP key
        key = self.retrieve_pgp_key(key_name)

        # Encrypt attributes
        for attribute in lookup:
            name = None
            for n in attributes:
                if attribute.type_is(n):
                    name = n
                    break
            if name is None:
                continue

            attribute.value = self.encrypt(attribute.value, key)

    def retrieve_pgp_key(self, filename: str) -> pgpy.PGPKey:
        """Read and return a PGP key file."""
        pgp_key_base_directory = 'resources/pgp'
        key, _ = pgpy.PGPKey.from_file(f'{pgp_key_base_directory}/{filename}')
        return key

    def encrypt(self, value: str, key: pgpy.PGPKey) -> str:
        """Encrypt a string using PGP."""
        message: pgpy.PGPMessage = pgpy.PGPMessage.new(value)
        message_encrypted: pgpy.PGPMessage = key.encrypt(message)
        return str(message_encrypted)


class FromPets(GeneratorJob):
    """Anonymize based on a collection of PETs.

    - pets
    - `list[dict | str | anonymizer.models.arxlet.Pet]`

    The PETs to apply.  Each entry should be a string/dict
    representation of the anonymizer.models.policies.Pet class, or an
    instance of it.

    - attributes
    - `list[str]`

    The Attribute type(s) to be anonymized.  Can be empty.

    - objects
    - `list[str]`

    The top-level Object type(s) to look up Attributes in.  If empty,
    anonymizes only top-level Attributes (not inside any Object).

    - attribute_hierarchies
    - `list[dict]`

    Contains string/dict representations of the
    anonymizer.models.policies.HierarchyAttribute class, or instances
    of it.  This field will contain a HierarchyAttribute object for
    each entry in the "attributes" field.

    - object_hierarchies
    - `list[dict | str | anonymizer.models.policies.HierarchyObject]`

    Contains string/dict representations of the
    anonymizer.models.policies.HierarchyObject class, or instances of
    it. This field will contain a hierarchy for each entry in the
    "objects" field.
    """

    PARAM_PETS = 'pets'
    PARAM_ATTS = 'attributes'
    PARAM_OBJS = 'objects'
    PARAM_ATTH = 'attribute_hierarchies'
    PARAM_OBJH = 'object_hierarchies'

    KNOWN_PETS: tuple[str, ...] = (
        'suppression',
        'generalization',
        'pgp',
    )

    @override
    async def generate(self, **kwargs) -> list[Job]:
        self.verify_parameters(kwargs,
                               self.PARAM_PETS,
                               self.PARAM_ATTS,
                               self.PARAM_OBJS,
                               self.PARAM_ATTH)
        pets = kwargs[self.PARAM_PETS]
        attributes: list[str] = kwargs[self.PARAM_ATTS]
        objects: list[str] = kwargs[self.PARAM_OBJS]
        att_hierarchies: list = kwargs[self.PARAM_ATTH]
        obj_hierarchies: list = kwargs[self.PARAM_OBJH]

        # Extract PETs
        pets_to_apply: list[Pet] = []
        for pet in pets:
            pet_parsed = self.parse_arg_as(pet, Pet)
            if pet_parsed.scheme not in self.KNOWN_PETS:
                log.info('Job "%s": Unknown Local PET scheme "%s", skipping',
                         self.name,
                         pet_parsed.scheme)
                continue
            pets_to_apply.append(pet_parsed)
        log.debug('Job "%s": Prepared %s PETs', self.name, len(pets_to_apply))

        ret: list[Job] = []
        for pet in pets_to_apply:
            match pet.scheme:
                case 'suppression' | 'generalization':
                    args = {
                        ApplyAnonymizationLevel.PARAM_LEVL: pet.metadata.level,
                        ApplyAnonymizationLevel.PARAM_ATTS: attributes,
                        ApplyAnonymizationLevel.PARAM_OBJS: objects,
                        ApplyAnonymizationLevel.PARAM_ATTH: att_hierarchies,
                    }
                    ret.append(ApplyAnonymizationLevel('apply-suppression',
                                                self.env,
                                                args,
                                                self))
                case 'pgp':
                    args = {
                        ApplyPGPEncryption.PARAM_KEY: 'key.gpg',
                        ApplyPGPEncryption.PARAM_ATTS: attributes,
                        ApplyPGPEncryption.PARAM_OBJS: objects,
                    }
                    ret.append(ApplyPGPEncryption('apply-pgp',
                                                  self.env,
                                                  args,
                                                  self))
                case _:
                    msg = f'Unknown Local PET scheme {pet.scheme}'
                    raise JobError(msg)
        return ret


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
    """

    PARAM_LOCP = 'privacy_policy_location'
    PARAM_LOCH = 'hierarchy_policy_location'

    @override
    async def generate(self, **kwargs) -> list[Job]:
        self.verify_parameters(kwargs, self.PARAM_LOCP, self.PARAM_LOCH)
        # Prepare variables from kwargs and env
        privacy_policy = self.get_from_env(kwargs[self.PARAM_LOCP],
                                           PrivacyPolicy)
        hierarchy_policy = self.get_from_env(kwargs[self.PARAM_LOCH],
                                             HierarchyPolicy)

        ret: list[Job] = []

        # Generate FromPets job
        pets: list[Pet] = []
        attribute_list: list[str] = []
        object_list: list[str] = []
        hierarchy_list = hierarchy_policy.hierarchy_attributes[:]
        for att_policy in privacy_policy.attributes:
            used = False
            for pet in att_policy.pets:
                if pet.scheme in FromPets.KNOWN_PETS:
                    used = True
                    pets.append(pet)
            if used:
                attribute_list.append(att_policy.name)
        for template in privacy_policy.templates:
            used: bool = False
            for att_policy in template.attributes:
                used2 = False
                for att_policy_pet in att_policy.pets:
                    if att_policy_pet.scheme in FromPets.KNOWN_PETS:
                        used = True
                        used2 = True
                        pets.append(att_policy_pet)
                if used2:
                    attribute_list.append(att_policy.name)
            if used:
                object_list.append(template.name)
                for hierarchy_object in hierarchy_policy.hierarchy_objects:
                    if hierarchy_object.misp_object_template == template.name:
                        hierarchy_list.extend(
                            hierarchy_object.attribute_hierarchies,
                        )
        if len(pets) > 0:
            args = {
                FromPets.PARAM_PETS: pets,
                FromPets.PARAM_ATTS: attribute_list,
                FromPets.PARAM_OBJS: object_list,
                FromPets.PARAM_ATTH: hierarchy_list,
                FromPets.PARAM_OBJH: hierarchy_policy.hierarchy_objects,
            }
            ret.append(FromPets('from-pets', self.env, args, self))

        return ret
