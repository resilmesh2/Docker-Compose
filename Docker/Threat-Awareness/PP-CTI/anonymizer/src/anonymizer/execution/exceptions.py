# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

class ExecutionError(RuntimeError):
    """Raised when the execution engine fails."""


class PipelineError(ExecutionError):
    """Raised when a pipeline fails."""


class StageError(ExecutionError):
    """Raised when an exception fails."""


class JobError(ExecutionError):
    """Raised when a job fails."""
