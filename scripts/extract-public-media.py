"""Extract only image directories already referenced by published public content."""
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile

DIRECTORY = re.compile(r"^(?:\d{4}/\d{2}|brand)/[0-9a-f-]{36}$")
EXTENSIONS = {'.webp', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.avif', '.ico'}

def extract_public_media(archive_path, output_path, directories):
    if not isinstance(directories, list) or not directories or len(directories) > 1000:
        raise ValueError('Expected a bounded public-media directory allowlist')
    if any(not isinstance(d, str) or not DIRECTORY.fullmatch(d) for d in directories):
        raise ValueError('Invalid public-media directory')
    allowed = set(directories)
    root = Path(output_path).resolve()
    root.mkdir(parents=True, exist_ok=True)
    count = total = 0
    with tarfile.open(archive_path, 'r:gz') as archive:
        for member in archive:
            name = member.name.removeprefix('./')
            if not member.isfile() or not name.startswith('media/'):
                continue
            relative = PurePosixPath(name.removeprefix('media/'))
            if str(relative.parent) not in allowed or relative.suffix.lower() not in EXTENSIONS:
                continue
            if '..' in relative.parts or not 0 < member.size <= 4 * 1024 * 1024:
                continue
            target = root.joinpath(*relative.parts).resolve()
            if not target.is_relative_to(root):
                raise ValueError('Archive target escaped output directory')
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is None:
                raise ValueError('Image content missing from backup')
            with source, target.open('wb') as destination:
                shutil.copyfileobj(source, destination)
            count += 1
            total += member.size
    if not count:
        raise ValueError('No allowlisted public images found in backup')
    return count, total

if __name__ == '__main__':
    count, size = extract_public_media(sys.argv[1], sys.argv[2], json.loads(os.environ['PUBLIC_MEDIA_DIRS']))
    print(f'Recovered {count} public images ({size} bytes); database tables were not extracted')
