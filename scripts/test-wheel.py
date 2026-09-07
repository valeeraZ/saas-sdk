"""Install and test the built wheel without importing repository source."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import venv

root = Path(__file__).resolve().parents[1]
wheel, = (root / 'artifacts').glob('frame_fastapi_auth-*.whl')
with tempfile.TemporaryDirectory(prefix='frame-wheel-') as temporary:
    target = Path(temporary)
    venv.EnvBuilder(with_pip=True).create(target / 'venv')
    python = target / 'venv/bin/python'
    subprocess.run([python, '-m', 'pip', 'install', str(wheel)], check=True, cwd=target)
    shutil.copytree(root / 'packages/fastapi-auth-sdk/tests', target / 'tests', ignore=shutil.ignore_patterns('__pycache__'))
    subprocess.run([python, '-I', '-c', 'import frame_fastapi_auth, sys; from pathlib import Path; assert Path(frame_fastapi_auth.__file__).is_relative_to(sys.prefix); print(frame_fastapi_auth.__file__)'], check=True, cwd=target)
    subprocess.run([python, '-I', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'], check=True, cwd=target)
(root / 'artifacts/wheel-consumer.json').write_text(json.dumps({'wheel': wheel.name, 'python': sys.version, 'tests': 4, 'status': 'passed'}, indent=2) + '\n')
