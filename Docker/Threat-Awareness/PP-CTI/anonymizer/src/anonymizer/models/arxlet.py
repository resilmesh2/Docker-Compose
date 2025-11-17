# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations

from anonymizer.models.base import Model

VERSION: str = '0.2'

SCHEME_KANON = 'k-anonymity'
SCHEME_KMAP = 'k-map'
SCHEME_DLDIV = 'l-diversity/distinct'
SCHEME_ELDIV = 'l-diversity/entropy'
SCHEME_RLDIV = 'l-diversity/recursive'
SCHEME_HTCLO = 't-closeness/hierarchical'
SCHEME_OTCLO = 't-closeness/ordered'


class KAnonMetadata(Model):
    k: int


class KMapMetadata(KAnonMetadata):
    context: list[list[ObjectData]]


class SensitiveMetadata(Model):
    attribute: str


class LDivMetadata(SensitiveMetadata):
    l: int  # noqa: E741


class CLDivMetadata(LDivMetadata):
    c: float


class TCloMetadata(SensitiveMetadata):
    t: float


class Attribute(Model):
    type: str
    value: str


class Object(Model):
    type: str
    values: list[Attribute]


class Pet(Model):
    scheme: str
    metadata: (KAnonMetadata | LDivMetadata | CLDivMetadata | TCloMetadata |
               KMapMetadata)


class Hierarchy(Model):
    type: str
    values: list[str]


class AttributeData(Model):
    value: str
    hierarchies: list[str]


class ObjectData(Model):
    values: list[Attribute]
    hierarchies: list[Hierarchy]


class AttributeRequest(Model):
    data: list[AttributeData]
    pets: list[Pet]


class AttributeResponseSingle(Attribute):
    pass


class ObjectRequest(Model):
    data: list[ObjectData]
    pets: list[Pet]


class ObjectResponseSingle(Object):
    pass


def pet_from_scheme(scheme: str,
                    metadata: dict,
                    sensitive: str | None = None,
                    context: list[list[ObjectData]] | None = None,
                    ) -> Pet:
    """Calculate PET object from scheme string.

    Returns the PET corresponding to the specified scheme, with the
    accompanying metadata.  Raises a TypeError if the PET doesn't
    correspond to an ARXlet PET.

    :param scheme: The PET scheme.

    :param metadata: The metadata dictionary.

    :param sensitive: Contains the sensitive attribute this PET might
    require.

    :param context: Contains the context this PET might require.
    """
    if SCHEME_KANON in scheme:
        meta = KAnonMetadata(k=metadata['k'])
        return Pet(scheme=SCHEME_KANON, metadata=meta)

    if SCHEME_DLDIV in scheme:
        if sensitive is None:
            msg = 'Sensitive must not be None'
            raise ValueError(msg)
        meta = LDivMetadata(attribute=sensitive, l=metadata['l'])
        return Pet(scheme=SCHEME_DLDIV, metadata=meta)

    if SCHEME_ELDIV in scheme:
        if sensitive is None:
            msg = 'Sensitive must not be None'
            raise ValueError(msg)
        meta = LDivMetadata(attribute=sensitive, l=metadata['l'])
        return Pet(scheme=SCHEME_ELDIV, metadata=meta)
    if SCHEME_RLDIV in scheme:
        if sensitive is None:
            msg = 'Sensitive must not be None'
            raise ValueError(msg)
        meta = CLDivMetadata(attribute=sensitive,
                             l=metadata['l'],
                             c=metadata['c'])
        return Pet(scheme=SCHEME_RLDIV, metadata=meta)

    if SCHEME_HTCLO in scheme:
        if sensitive is None:
            msg = 'Sensitive must not be None'
            raise ValueError(msg)
        meta = TCloMetadata(attribute=sensitive, t=metadata['t'])
        return Pet(scheme=SCHEME_HTCLO, metadata=meta)

    if SCHEME_OTCLO in scheme:
        if sensitive is None:
            msg = 'Sensitive must not be None'
            raise ValueError(msg)
        meta = TCloMetadata(attribute=sensitive, t=metadata['t'])
        return Pet(scheme=SCHEME_OTCLO, metadata=meta)

    if SCHEME_KMAP in scheme:
        if context is None:
            msg = 'Context must not be None'
            raise ValueError(msg)
        meta = KMapMetadata(k=metadata['k'], context=context)
        return Pet(scheme=SCHEME_KMAP, metadata=meta)

    msg = f'Unknown scheme "{scheme}"'
    raise TypeError(msg)
