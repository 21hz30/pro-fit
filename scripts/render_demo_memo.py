#!/usr/bin/env python3
"""Render the editable recording script as the university demo memo PDF.

Requires reportlab. On macOS the default fonts include Chinese glyphs; pass
--font-dir on another platform with Arial.ttf, Arial Bold.ttf, Arial Unicode.ttf.
"""
from argparse import ArgumentParser
from pathlib import Path
from xml.sax.saxutils import escape
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
NAVY = colors.HexColor('#081B40')
ORANGE = colors.HexColor('#BF430D')
INK = colors.HexColor('#263347')
MUTED = colors.HexColor('#5D6879')
LINE = colors.HexColor('#DCE2EC')


def markup(text):
    """Handle the limited inline markup used in the recording script."""
    text = escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', lambda m: '<b>' + m.group(1) + '</b>'
                  if m.group(1).isascii() else m.group(1), text)
    return re.sub(r'`(.+?)`', r'\1', text)


def footer(canvas, doc):
    width, _ = A4
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(doc.leftMargin, 35, width - doc.rightMargin, 35)
    canvas.setFont('BodyLatin', 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 22, 'PRO-FIT  /  DEMO VIDEO RECORDING SCRIPT  /  2026-10-03')
    canvas.drawRightString(width - doc.rightMargin, 22, str(doc.page))
    canvas.restoreState()


def render(source, output, font_dir):
    for name, file in [('BodyLatin', 'Arial.ttf'), ('BoldLatin', 'Arial Bold.ttf'),
                       ('BodyCJK', 'Arial Unicode.ttf')]:
        path = font_dir / file
        if not path.exists():
            raise FileNotFoundError(f'Font not found: {path}; use --font-dir.')
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily('BodyLatin', normal='BodyLatin', bold='BoldLatin',
                                 italic='BodyLatin', boldItalic='BoldLatin')
    styles = {
        'title': ParagraphStyle('title', fontName='BoldLatin', fontSize=24, leading=28,
                                textColor=NAVY, spaceAfter=9),
        'subtitle': ParagraphStyle('subtitle', fontName='BodyLatin', fontSize=10,
                                   leading=14, textColor=MUTED, spaceAfter=13),
        'section': ParagraphStyle('section', fontName='BoldLatin', fontSize=15,
                                  leading=19, textColor=NAVY, spaceBefore=8,
                                  spaceAfter=9, keepWithNext=True),
        'body': ParagraphStyle('body', fontName='BodyLatin', fontSize=10.4, leading=15,
                               textColor=INK, spaceAfter=8),
        'cue': ParagraphStyle('cue', fontName='BodyCJK', fontSize=9.1, leading=14,
                              wordWrap='CJK', textColor=INK),
        'label': ParagraphStyle('label', fontName='BoldLatin', fontSize=8.2,
                                leading=11, textColor=ORANGE, spaceAfter=5),
        'notes': ParagraphStyle('notes', fontName='BodyCJK', fontSize=9.2, leading=14,
                                wordWrap='CJK', textColor=INK, spaceAfter=8),
    }
    doc = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=43, rightMargin=43,
                            topMargin=42, bottomMargin=49,
                            title='Pro-fit University Demo - Updated Recording Script',
                            author='Pro-fit', pageCompression=1)
    source_text = source.read_text()
    sections = re.split(r'^## ', source_text, flags=re.M)[1:]
    if len(sections) != 12:
        raise ValueError('Expected 11 scenes and one recording-notes section.')
    story = [Paragraph('Pro-fit Demo Video<br/>Recording Script', styles['title']),
             Paragraph('English narration + Chinese screen instructions<br/>'
                       'Based on Michael\'s original story and the current page guides.<br/>'
                       '2026-10-03  |  About 1,000 spoken words  |  Allow 8-9 minutes',
                       styles['subtitle'])]
    # Scene boundaries keep complete recording segments together on each page.
    new_pages = {2, 3, 5, 7, 9}
    for index, section in enumerate(sections):
        if index in new_pages:
            story.append(PageBreak())
        heading, content = section.split('\n', 1)
        if index == 11:
            heading = 'Recording notes - for the presenter'
        story.append(Paragraph(escape(heading), styles['section']))
        for block in content.strip().split('\n\n'):
            if not block.strip():
                continue
            if block.startswith('**操作'):
                cue = re.sub(r'^\*\*操作：\*\*\s*', '', block)
                box = Table([[Paragraph('SCREEN ACTION - DO NOT READ ALOUD', styles['label'])],
                             [Paragraph(markup(cue), styles['cue'])]], colWidths=[doc.width])
                box.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F4F9')),
                    ('BOX', (0,0), (-1,-1), 0.5, LINE),
                    ('LEFTPADDING', (0,0), (-1,-1), 11),
                    ('RIGHTPADDING', (0,0), (-1,-1), 11),
                    ('TOPPADDING', (0,0), (-1,0), 9),
                    ('BOTTOMPADDING', (0,0), (-1,0), 1),
                    ('TOPPADDING', (0,1), (-1,1), 0),
                    ('BOTTOMPADDING', (0,1), (-1,1), 9),
                ]))
                story.extend([box, Spacer(1,9)])
            elif index == 11:
                for line in block.splitlines():
                    if line.strip():
                        story.append(Paragraph(markup(line.lstrip('- ')), styles['notes']))
            else:
                story.append(Paragraph(markup(block), styles['body']))
    output.parent.mkdir(parents=True, exist_ok=True)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(output)


if __name__ == '__main__':
    args = ArgumentParser(description=__doc__)
    args.add_argument('--source', type=Path, default=ROOT / 'DEMO_PRESENTATION_SCRIPT.md')
    args.add_argument('--output', type=Path,
                      default=ROOT / 'output/pdf/Pro-fit_University_Demo_Video_Memo.pdf')
    args.add_argument('--font-dir', type=Path,
                      default=Path('/System/Library/Fonts/Supplemental'))
    options = args.parse_args()
    render(options.source, options.output, options.font_dir)
