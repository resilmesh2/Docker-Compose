# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from typing import override
from anonymizer.config import log
from anonymizer.execution.exceptions import JobError
from anonymizer.execution.jobs import Job
from anonymizer.models.policies import HierarchyPolicy, PrivacyPolicy


class ReadPrivacyPolicy(Job):
    """Read, parse and store a privacy policy.

    - address
    - `str`

    The location of the privacy policy.  The string should be in the
    format "a.b.c.d", where (a, b, c) represent optional intermediate
    objects, and (d) represents the object that contains the privacy
    policy.

    - location
    - `str`

    The location where the privacy policy should be stored.
    """

    PARAM_ADDR = 'address'
    PARAM_LOCT = 'location'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs, self.PARAM_ADDR, self.PARAM_LOCT)
        data = self.request().json
        address = kwargs[self.PARAM_ADDR]
        location = kwargs[self.PARAM_LOCT]
        split = address.split('.')
        for intermediate in split:
            if not isinstance(data, dict):
                msg = f'Reached recursion end before "{intermediate}"'
                raise JobError(msg)
            try:
                data = data[intermediate]
            except KeyError as e:
                msg = f'Intermediate object {intermediate} not present'
                raise JobError(msg) from e

        if not isinstance(data, dict):
            msg = 'Target address is not a JSON object'
            raise JobError(msg)

        policy = PrivacyPolicy.model_validate(data)
        log.debug('Job "%s": Storing privacy policy in location "%s"',
                  self.name,
                  location)
        setattr(self.env, location, policy)


class ReadHierarchyPolicy(Job):
    """Read, parse and store a hierarchy policy.

    - address
    - `str`

    The location of the hierarchy policy.  The string should be in the
    format "a.b.c.d", where (a, b, c) represent optional intermediate
    objects, and (d) represents the object that contains the hierarchy
    policy.

    - location
    - `str`

    The location where the hierarchy policy should be stored.
    """

    PARAM_ADDR = 'address'
    PARAM_LOCT = 'location'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs, self.PARAM_ADDR)
        data = self.request().json
        address = kwargs[self.PARAM_ADDR]
        location = kwargs[self.PARAM_LOCT]
        split = address.split('.')
        for intermediate in split:
            if not isinstance(data, dict):
                msg = f'Reached recursion end before "{intermediate}"'
                raise JobError(msg)
            try:
                data = data[intermediate]
            except KeyError as e:
                msg = f'Intermediate object {intermediate} not present'
                raise JobError(msg) from e

        if not isinstance(data, dict):
            msg = 'Target address is not a JSON object'
            raise JobError(msg)

        policy = HierarchyPolicy.model_validate(data)
        log.debug('Job "%s": Storing hierarchy policy in location "%s"',
                  self.name,
                  location)
        setattr(self.env, location, policy)
