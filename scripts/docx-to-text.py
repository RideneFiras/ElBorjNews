#!/usr/bin/env python3
"""Print the text of a .docx file, one paragraph per line (used by the publish-article skill).

Usage: python3 -I scripts/docx-to-text.py posts/<n>/file.docx [--marks]

Standard library only (no python-docx on this machine). Paragraphs are separated by a blank
line; line breaks inside a paragraph (<w:br/>) stay as a newline. With --marks, bold runs are
wrapped in **…**, and each paragraph is prefixed with its Word style when it isn't Normal
(e.g. [Heading1]), so you can see headings and labels. Without --marks the output is the plain
text to write to source.txt.
"""
import sys
import zipfile
import xml.etree.ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def is_on(el):
    return el is not None and el.get(W + 'val') not in ('0', 'false', 'none')


def paragraph_text(p, marks):
    style = p.find(f'{W}pPr/{W}pStyle')
    out = []
    for r in p.iter(W + 'r'):
        bold = is_on(r.find(f'{W}rPr/{W}b'))
        text = ''
        for child in r:
            if child.tag == W + 't':
                text += child.text or ''
            elif child.tag == W + 'tab':
                text += '\t'
            elif child.tag in (W + 'br', W + 'cr'):
                text += '\n'
        if marks and bold and text.strip():
            text = f'**{text}**'
        out.append(text)
    line = ''.join(out)
    if marks and style is not None and style.get(W + 'val') not in ('Normal', None):
        line = f'[{style.get(W + "val")}] {line}'
    return line


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    marks = '--marks' in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)
    with zipfile.ZipFile(args[0]) as z:
        root = ET.fromstring(z.read('word/document.xml'))
        images = [n for n in z.namelist() if n.startswith('word/media/')]
    body = root.find(W + 'body')
    if body is None:
        sys.exit('no <w:body> in word/document.xml')
    paras = []
    for el in body:
        if el.tag == W + 'p':
            paras.append(paragraph_text(el, marks))
        elif el.tag == W + 'tbl':
            for row in el.iter(W + 'tr'):
                cells = [' '.join(paragraph_text(p, marks) for p in tc.iter(W + 'p')) for tc in row.iter(W + 'tc')]
                paras.append(' | '.join(cells))
    text = '\n\n'.join(p.rstrip() for p in paras if p.strip())
    print(text)
    if marks and images:
        print(f'\n[{len(images)} picture(s) inside the docx: {", ".join(images)}]', file=sys.stderr)


if __name__ == '__main__':
    main()
