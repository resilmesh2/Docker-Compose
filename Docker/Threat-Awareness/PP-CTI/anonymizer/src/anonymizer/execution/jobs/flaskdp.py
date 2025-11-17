# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from types import SimpleNamespace
from typing import override

from anonymizer.clients import ClientError
from anonymizer.clients.flaskdp import FlaskDPClient
from anonymizer.config import config, log
from anonymizer.execution.exceptions import JobError
from anonymizer.execution.jobs import AnonymizingJob, GeneratorJob
from anonymizer.models import data_model
from anonymizer.models import flaskdp as flaskdp_model
from anonymizer.models.policies import PrivacyPolicy

TYPE_ANONYMIZABLE_BY_FLASKDP = 'flaskdp:anonymizable'


class FlaskDPJob(AnonymizingJob):
    """Abstract class for FlaskDP-related jobs to inherit from.

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    TYPE_ANONYMIZABLE = TYPE_ANONYMIZABLE_BY_FLASKDP

    PARAM_ATTS = 'attributes'
    PARAM_EPSL = 'epsilon'
    PARAM_DELT = 'delta'
    PARAM_SENS = 'sensitivity'
    PARAM_UPPR = 'upper'
    PARAM_LOWR = 'lower'
    PARAM_OBJS = 'objects'
    PARAM_URLF = 'flaskdp_url'

    def __init__(self,
                 name: str,
                 env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None,
                 ):
        super().__init__(name, env, args, generator)

    def prepare_values(self,
                       _id: str,
                       values: list[data_model.Attribute],
                       ) -> flaskdp_model.ItemRequest:
        mech = flaskdp_model.Mechanism.LAPLACE
        ret = flaskdp_model.ItemRequest(id=_id,
                                        values=[],
                                        epsilon=0,
                                        delta=0,
                                        sensitivity=0,
                                        mechanism=mech,
                                        upper=0,
                                        lower=0)
        for value in values:
            try:
                ret.values.append(float(value.value))
            except ValueError:
                log.error('Job "%s": unable to parse value "%s" of attribute '
                          '"%s" as float',
                          self.name,
                          value.value,
                          value.name)

        return ret

    def update_values(self,
                      data: list[data_model.Attribute],
                      values: list[float],
                      ):
        for i, att in enumerate(data):
            log.debug('Job "%s": updating old value %s with new value %s',
                      self.name,
                      att.value,
                      values[i])
            att.value = str(values[i])

    async def _inner(self,
                     mechanism: flaskdp_model.Mechanism,
                     **kwargs,
                     ):
        # Prepare variables
        data = self.anonymizable_components()
        attributes: list[str] = kwargs[self.PARAM_ATTS]  # Should exist
        epsilon: float = kwargs[self.PARAM_EPSL]  # Should exist
        delta: float = kwargs.get(self.PARAM_DELT, 0)
        sensitivity: float = kwargs[self.PARAM_SENS]  # Should exist
        upper: float = kwargs.get(self.PARAM_UPPR, 1)
        lower: float = kwargs.get(self.PARAM_LOWR, 0)
        objects: list[str] = kwargs.get(self.PARAM_OBJS, [])
        url = kwargs.get(self.PARAM_URLF,
                         config.services.flaskdp.url.unicode_string())

        # Prepare request
        req = flaskdp_model.FlaskDPRequest(items=[])
        request_attributes = {}

        # If extracting Attributes from Objects:
        if len(objects) > 0:
            # Extract Objects Objects must be anonymizable and be from
            # a specific set of types.
            count = 0
            for _obj in self.extract_objects(data,
                                             TYPE_ANONYMIZABLE_BY_FLASKDP,
                                             *objects):
                # Extract Attributes from _obj.  The Attribute must be
                # anonymizable and (if specified), be of a specific
                # type
                tmp = self.extract_attributes(_obj.value,
                                              TYPE_ANONYMIZABLE_BY_FLASKDP,
                                              *attributes)
                # Prepare FlaskDP request item
                item_id = f'obj{_obj.name}-{count}'
                item = self.prepare_values(item_id, tmp)

                # Update FlaskDP request item values
                item.epsilon = epsilon
                item.delta = delta
                item.sensitivity = sensitivity
                item.upper = upper
                item.lower = lower
                item.mechanism = mechanism

                # Append to request
                req.items.append(item)
                request_attributes[item_id] = tmp
                count = count + 1
        # Otherwise, extracting Attributes from the Request
        else:
            for _att in attributes:
                # Extract Attributes.  Attributes must be anonymizable
                # and be of a specific type
                tmp = self.extract_attributes(data,
                                              TYPE_ANONYMIZABLE_BY_FLASKDP,
                                              *attributes)
                # Prepare FlaskDP request item
                item_id = _att
                item = self.prepare_values(item_id, tmp)

                # Update FlaskDP request item values
                item.epsilon = epsilon
                item.delta = delta
                item.sensitivity = sensitivity
                item.upper = upper
                item.lower = lower
                item.mechanism = mechanism

                # Append to request
                req.items.append(item)
                request_attributes[item_id] = tmp

        # Send request
        try:
            async with FlaskDPClient(url) as client:
                resp = await client.apply_dp(req)
                if resp is None:
                    msg = 'FlaskDP request failed'
                    raise JobError(msg)
        except ClientError as e:
            msg = 'Client exception raised'
            raise JobError(msg) from e

        # Update values
        for item in resp.items:
            attribute_list = request_attributes[item.id]
            self.update_values(attribute_list, item.values)


class FromPrivacyPolicy(GeneratorJob):
    """Anonymize using a privacy policy.

    Applies the DP techniques specified in the privacy policy to their
    corresponding Attributes.  This job requires the privacy policy to
    have been previously parsed by another job.

    - privacy_policy_location
    - `str`

    The location of the privacy policy.

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    PARAM_LOCT = 'privacy_policy_location'
    PARAM_URLF = 'flaskdp_url'

    def __init__(self,
                 name: str,
                 env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None,
                 ):
        super().__init__(name, env, args, generator)

    @override
    async def generate(self, **kwargs) -> list[AnonymizingJob]:
        self.verify_parameters(kwargs, self.PARAM_LOCT)
        url = kwargs.get(FromTechnique.PARAM_URLF,
                         config.services.flaskdp.url.unicode_string())
        ret = []
        privacy_policy = self.get_from_env(kwargs[self.PARAM_LOCT],
                                           PrivacyPolicy)

        # The jobs can't be grouped by technique, because metadata
        # might differ

        # Parse attribute policies
        for attribute_policy in privacy_policy.attributes:
            if not attribute_policy.dp:
                continue
            if attribute_policy.dp_policy is None:
                msg = ('Missing DP policy for attribute '
                       f'"{attribute_policy.name}"')
                raise JobError(msg)
            args = {
                FromTechnique.PARAM_ATTS: [attribute_policy.name],
                FromTechnique.PARAM_TECH: attribute_policy.dp_policy.scheme,
                FromTechnique.PARAM_URLF: url,
            }
            args.update(attribute_policy.dp_policy.metadata)
            ret.append(FromTechnique(name=f'{len(ret)}_attribute',
                                     args=args,
                                     generator=self))

        # Parse object policies
        for object_policy in privacy_policy.templates:
            if not object_policy.dp:
                continue
            if object_policy.dp_policy is None:
                msg = (f'Missing DP policy for object "{object_policy.name}"')
                raise JobError(msg)
            if object_policy.dp_policy.apply_to_all:
                attributes = []
            else:
                attributes = object_policy.dp_policy.attribute_names
            args = {
                FromTechnique.PARAM_ATTS: attributes,
                FromTechnique.PARAM_TECH: object_policy.dp_policy.scheme,
                FromTechnique.PARAM_OBJS: [object_policy.name],
                FromTechnique.PARAM_URLF: url,
            }
            args.update(object_policy.dp_policy.metadata)
            ret.append(FromTechnique(name=f'{len(ret)}_object',
                                     args=args,
                                     generator=self))
        return ret


class FromTechnique(FlaskDPJob):
    """Apply Differential Privacy.

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.

    - technique
    - `str`

    The Differential Privacy technique.

    - epsilon
    - `float`

    The epsilon value.  Refer to each specific technique's job to
    check for constraints.

    - delta
    - `float`

    The delta value.  Refer to each specific technique's job to check
    for constraints.

    - sensitivity
    - `float`

    The sensitivity value.  Refer to each specific technique's job to
    check for constraints.

    - upper (Optional)
    - `float`

    The upper bound.  Refer to each specific technique's job to check
    for constraints.  Will be ignored if the technique doesn't need it

    - lower
    - `float`

    The lower bound.  Refer to each specific technique's job to check
    for constraints.  Will be ignored if the technique doesn't need it

    - objects
    - `list[str]`

    A list of objects that should be used to look up attributes.  If
    this parameter is included and the "attributes" parameter is
    empty, all of the Object's Attributes will be used instead

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    PARAM_TECH = 'technique'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_TECH,
                               self.PARAM_ATTS,
                               self.PARAM_EPSL,
                               self.PARAM_DELT,
                               self.PARAM_SENS)
        # Validate technique
        tech = flaskdp_model.Mechanism.from_string(kwargs[self.PARAM_TECH])
        await self._inner(tech, **kwargs)


class Laplace(FlaskDPJob):
    """Apply Differential Privacy (Laplace).

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.

    - epsilon
    - `float`

    The epsilon value.  Must be in [0, ∞].

    - delta
    - `float`

    The delta value.  Must be in [0, 1].  Cannot be simultaneously
    zero with epsilon.

    - sensitivity
    - `float`

    The sensitivity value.  Must be in [0, ∞).

    - objects
    - `list[str]`

    A list of objects that should be used to look up attributes.  If
    this parameter is included and the "attributes" parameter is
    empty, all of the Object's Attributes will be used instead

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_ATTS,
                               self.PARAM_EPSL,
                               self.PARAM_DELT,
                               self.PARAM_SENS)
        await self._inner(flaskdp_model.Mechanism.LAPLACE, **kwargs)


class LaplaceTruncated(FlaskDPJob):
    """Apply Differential Privacy (Truncated Laplace).

    - attributes `list[str]`

    The attribute type(s) to be anonymized.

    - epsilon
    - `float`

    The epsilon value.  Must be in [0, ∞].

    - delta
    - `float`

    The delta value.  Must be in [0, 1].  Cannot be simultaneously
    zero with epsilon.

    - sensitivity
    - `float`

    The sensitivity value.  Must be in [0, ∞).

    - upper
    - `float`

    The upper bound.

    - lower
    - `float`

    The lower bound.

    - objects
    - `list[str]`

    A list of objects that should be used to look up attributes.  If
    this parameter is included and the "attributes" parameter is
    empty, all of the Object's Attributes will be used instead

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_ATTS,
                               self.PARAM_EPSL,
                               self.PARAM_DELT,
                               self.PARAM_SENS,
                               self.PARAM_UPPR,
                               self.PARAM_LOWR)
        await self._inner(flaskdp_model.Mechanism.LAPLACE_TRUNCATED,
                          **kwargs)


class LaplaceBoundedDomain(FlaskDPJob):
    """Apply Differential Privacy (Laplace with bounded domain).

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.

    - epsilon
    - `float`

    The epsilon value.  Must be in [0, ∞].

    - delta
    - `float`

    The delta value.  Must be in [0, 1].  Cannot be simultaneously
    zero with epsilon.

    - sensitivity
    - `float`

    The sensitivity value.  Must be in [0, ∞).

    - upper
    - `float`

    The upper bound.

    - lower
    - `float`

    The lower bound.

    - objects
    - `list[str]`

    A list of objects that should be used to look up attributes.  If
    this parameter is included and the "attributes" parameter is
    empty, all of the Object's Attributes will be used instead

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_ATTS,
                               self.PARAM_EPSL,
                               self.PARAM_DELT,
                               self.PARAM_SENS,
                               self.PARAM_UPPR,
                               self.PARAM_LOWR)
        await self._inner(
            flaskdp_model.Mechanism.LAPLACE_BOUNDED_DOMAIN,
            **kwargs,
        )


class LaplaceBoundedNoise(FlaskDPJob):
    """Apply Differential Privacy (Laplace with bounded noise).

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.

    - epsilon
    - `float`

    The epsilon value.  Must be in (0, ∞].

    - delta
    - `float`

    The delta value.  Must be in (0, 0.5)..

    - sensitivity
    - `float`

    The sensitivity value.  Must be in [0, ∞).

    - objects
    - `list[str]`

    A list of objects that should be used to look up attributes.  If
    this parameter is included and the "attributes" parameter is
    empty, all of the Object's Attributes will be used instead.

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_ATTS,
                               self.PARAM_EPSL,
                               self.PARAM_DELT,
                               self.PARAM_SENS)
        await self._inner(
            flaskdp_model.Mechanism.LAPLACE_BOUNDED_NOISE,
            **kwargs,
        )


class Gaussian(FlaskDPJob):
    """Apply Differential Privacy (Gaussian distribution).

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.

    - epsilon
    - `float`

    The epsilon value.  Must be in (0, 1].

    - delta
    - `float`

    The delta value.  Must be in (0, 1]..

    - sensitivity
    - `float`

    The sensitivity value.  Must be in [0, ∞).

    - objects
    - `list[str]`

    A list of objects that should be used to look up attributes.  If
    this parameter is included and the "attributes" parameter is
    empty, all of the Object's Attributes will be used instead.

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_ATTS,
                               self.PARAM_EPSL,
                               self.PARAM_DELT,
                               self.PARAM_SENS)
        await self._inner(flaskdp_model.Mechanism.GAUSSIAN,
                          **kwargs)


class GaussianAnalytic(FlaskDPJob):
    """Apply Differential Privacy (Analytical Gaussian mechanism).

    - attributes
    - `list[str]`

    The attribute type(s) to be anonymized.

    - epsilon
    - `float`

    The epsilon value.  Must be in (0, ∞].

    - delta
    - `float`

    The delta value.  Must be in (0, 1]..

    - sensitivity
    - `float`

    The sensitivity value.  Must be in [0, ∞).

    - objects
    - `list[str]`

    A list of objects that should be used to look up attributes.  If
    this parameter is included and the "attributes" parameter is
    empty, all of the Object's Attributes will be used instead.

    - flaskdp_url (Optional)
    - `str`

    An alternative URL to send the FlaskDP requests to.
    """

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_ATTS,
                               self.PARAM_EPSL,
                               self.PARAM_DELT,
                               self.PARAM_SENS)
        await self._inner(flaskdp_model.Mechanism.GAUSSIAN_ANALYTIC,
                          **kwargs)
