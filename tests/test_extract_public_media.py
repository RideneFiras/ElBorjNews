import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('extract_media', Path(__file__).resolve().parents[1] / 'scripts/extract-public-media.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PublicMediaExtractionTests(unittest.TestCase):
    def test_only_published_image_directories_are_extracted(self):
        directory = '2026/11/00000000-0000-0000-0000-000000000001'
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / 'backup.tgz'
            with tarfile.open(archive, 'w:gz') as output:
                for name in [f'./media/{directory}/w480.webp', './tables/profiles.json', './media/2026/11/00000000-0000-0000-0000-000000000002/original.webp', f'./media/{directory}/secret.json']:
                    entry = tarfile.TarInfo(name)
                    entry.size = 4
                    output.addfile(entry, io.BytesIO(b'data'))
                link = tarfile.TarInfo(f'./media/{directory}/link.webp')
                link.type = tarfile.SYMTYPE
                link.linkname = '/etc/passwd'
                output.addfile(link)
            destination = Path(temp) / 'public'
            self.assertEqual(module.extract_public_media(archive, destination, [directory]), (1, 4))
            self.assertEqual([p.relative_to(destination).as_posix() for p in destination.rglob('*') if p.is_file()], [f'{directory}/w480.webp'])
    def test_rejects_unbounded_or_traversing_allowlists(self):
        for value in [[], ['../../private'], ['2026/11/not-a-uuid'], 'not-a-list']:
            with self.assertRaises(ValueError):
                module.extract_public_media('unused', 'unused', value)

if __name__ == '__main__':
    unittest.main()
