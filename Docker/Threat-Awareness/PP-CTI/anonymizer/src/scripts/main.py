# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

# ruff: noqa: T201
import argparse
from pathlib import Path
import shutil
import subprocess  # noqa: S404


# Extra ruff arguments when checking inside a CI/CD pipeline.
CI_CD_LINT_EXTRAS = ['--ignore', 'D102,D103']


def build():
    """Build script."""
    parser = argparse.ArgumentParser(
        prog='uv run build',
        description='Anonymizer build script',
    )
    parser.add_argument('tag', help='Image tag')
    parser.add_argument('-b', '--backend',
                        default='docker',
                        choices=['docker', 'buildah'],
                        help='Image build backend')
    args = parser.parse_args()
    exit(_run(f'{args.backend} build . -t', args.tag))


def local():
    """Local execution script."""
    parser = argparse.ArgumentParser(
        prog='uv run local',
        description='Anonymizer local execution script',
    )
    parser.add_argument('--host',
                        default='127.0.0.1',
                        help='Host address')
    parser.add_argument('--port',
                        default='8080',
                        help='Port to serve on')
    parser.add_argument('--fast',
                        action='store_true',
                        help='Set the number of workers to max allowed')
    parser.add_argument('-d', '--dev',
                        action='store_true',
                        help='debug + auto reload')

    parser.add_argument('--extra-jobs',
                        type=Path,
                        help='Additional Job modules')

    parser.add_argument('--extra-transformers',
                        type=Path,
                        help='Additional Transformer modules')

    parser.add_argument('--extra-pipelines',
                        type=Path,
                        help='Additional pipelines')

    parser.add_argument('--extra-pgp-keys',
                        type=Path,
                        help='Additional PGP keys')

    parser.add_argument('--extra-requirements',
                        type=Path,
                        help='Additional requirements.txt file')

    args = parser.parse_args()

    options = []

    options.extend(['--host', args.host])
    options.extend(['--port', args.port])
    if args.fast:
        options.append('--fast')
    if args.dev:
        options.append('--dev')

    if args.extra_jobs is not None:
        _copy_contents(args.extra_jobs,
                       Path('src/anonymizer/execution/jobs'))
        count = sum(1 for _ in args.extra_jobs.iterdir())
        print(f'Copied {count} extra Job modules', flush=True)

    if args.extra_transformers is not None:
        _copy_contents(args.extra_transformers,
                       Path('src/anonymizer/transformers'))
        count = sum(1 for _ in args.extra_transformers.iterdir())
        print(f'Copied {count} extra Transformer modules', flush=True)

    if args.extra_pipelines is not None:
        _copy_contents(args.extra_pipelines,
                       Path('pipelines'))
        count = sum(1 for _ in args.extra_pipelines.iterdir())
        print(f'Copied {count} extra pipelines', flush=True)

    if args.extra_pgp_keys is not None:
        _copy_contents(args.extra_pgp_keys,
                       Path('resources/pgp'))
        count = sum(1 for _ in args.extra_pgp_keys.iterdir())
        print(f'Copied {count} extra PGP keys', flush=True)

    if args.extra_requirements is not None:
        if not args.extra_requirements.exists():
            print(f'File {args.extra_requirements} not found, skipping',
                  flush=True)
        else:
            # This is scuffed and will probably break eventually.
            res = _run('uv add --group custom -r',
                       str(args.extra_requirements))
            if res != 0:
                exit(res)
            print(f'Installed requirements from {args.extra_requirements}',
                  flush=True)

    print('Starting up...', flush=True)
    exit(_run('sanic', *options, 'anonymizer.server:anonymizer'))


def test():
    """Test script."""
    parser = argparse.ArgumentParser(
        prog='uv run test',
        description='Anonymizer test script',
    )
    parser.add_argument('-u', '--unit-tests',
                        action='store_true',
                        help='Run unit tests only')
    args = parser.parse_args()
    options = []
    if args.unit_tests:
        options.extend(['-k', 'not deployment'])
    options.append('test')
    _run('pytest', *options)


def lint():
    """Lint script."""
    parser = argparse.ArgumentParser(
        prog='uv run lint',
        description='Anonymizer lint script',
    )
    parser.add_argument('-t', '--tests',
                        action='store_true',
                        help='Check tests only')
    parser.add_argument('--lenient',
                        action='store_true',
                        help='Run CI/CD linting only')
    parser.add_argument('-o', '--output-format',
                        default='full',
                        help='Ruff output format')

    args = parser.parse_args()

    options = ['test' if args.tests else 'src']

    options.extend(['--output-format', args.output_format])

    if args.lenient:
        options.extend(CI_CD_LINT_EXTRAS)

    _run('ruff check', *options)


def _run(base: str, *args) -> int:
    cmd = base.split(' ')
    cmd.extend(args)
    return subprocess.run(cmd).returncode  # noqa: S603


def _copy_contents(src: Path, dst: Path):
    if not dst.is_dir():
        print(f'Expected {dst} to be a directory', flush=True)
        exit(1)

    if src.is_file():
        shutil.copy2(src, dst)
    else:
        for item in src.iterdir():
            if item.is_dir():
                shutil.copytree(item, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dst)
