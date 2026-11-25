#!/usr/bin/env python3
"""
Render the bundled sample lab report.

The sample has to look like a real Latin American lab printout, because the
extraction is only convincing when the input is convincing: decimal commas, mixed
case analyte names, the abbreviated forms a lab actually prints (`TGP`, `Hb`,
`Leucocitos`), and reference ranges in a side column that the model must ignore.

Output: public/sample-report.png (and a base64 copy for the HTML module).
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "public" / "sample-report.png"

W, H = 1000, 1290
BG = (252, 252, 250)
INK = (24, 28, 38)
MUTED = (108, 116, 132)
RULE = (206, 212, 222)
HEAD = (13, 148, 136)

ROWS = [
    ("Glucosa en ayunas", "92", "mg/dL", "70 - 110"),
    ("Urea", "28", "mg/dL", "15 - 45"),
    ("Creatinina", "1,1", "mg/dL", "0,7 - 1,3"),
    ("Sodio", "140", "mEq/L", "135 - 145"),
    ("Potasio", "4,2", "mEq/L", "3,5 - 5,1"),
    ("Cloro", "102", "mEq/L", "98 - 107"),
    ("Colesterol total", "182", "mg/dL", "< 200"),
    ("Colesterol HDL", "48", "mg/dL", "> 40"),
    ("Colesterol LDL", "110", "mg/dL", "< 130"),
    ("Trigliceridos", "148", "mg/dL", "< 150"),
    ("TGP (ALT)", "31", "U/L", "7 - 45"),
    ("TGO (AST)", "27", "U/L", "8 - 40"),
    ("Fosfatasa alcalina", "88", "U/L", "40 - 129"),
    ("Bilirrubina total", "0,7", "mg/dL", "0,3 - 1,2"),
    ("Proteinas totales", "7,1", "g/dL", "6,4 - 8,3"),
    ("Albumina", "4,3", "g/dL", "3,5 - 5,2"),
    ("Hemoglobina", "14,2", "g/dL", "13,2 - 17,2"),
    ("Hematocrito", "42,5", "%", "39 - 49"),
    ("Leucocitos", "7,2", "10^3/uL", "4,0 - 11,0"),
    ("Plaquetas", "248", "10^3/uL", "150 - 400"),
    ("HbA1c", "5,7", "%", "4,0 - 5,6"),
    ("TSH", "2,1", "mIU/L", "0,4 - 4,0"),
]


def font(size, bold=False):
    candidates = [
        "/usr/share/fonts/TTF/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),
        "/usr/share/fonts/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def main():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    f_title = font(30, True)
    f_sub = font(16)
    f_small = font(14)
    f_head = font(15, True)
    f_row = font(19)
    f_row_b = font(19, True)
    f_note = font(13)

    d.rectangle([0, 0, W, 8], fill=HEAD)

    d.text((60, 46), "LABORATORIO CLINICO SAN RAFAEL", font=f_title, fill=INK)
    d.text((60, 86), "Av. Javier Prado Este 1450, San Isidro, Lima", font=f_sub, fill=MUTED)
    d.text((60, 108), "RUC 20512345678  ·  Tel. (01) 421-8800", font=f_sub, fill=MUTED)

    d.line([60, 150, W - 60, 150], fill=RULE, width=2)

    left = [
        ("Paciente", "CASTILLO, MARIA ELENA"),
        ("Documento", "DNI 44551203"),
        ("Edad / Sexo", "41 anos / F"),
        ("Fecha de toma", "22/11/2026  07:35"),
        ("Fecha de informe", "22/11/2026  14:10"),
    ]
    y = 172
    for k, v in left:
        d.text((60, y), f"{k}:", font=f_small, fill=MUTED)
        d.text((210, y), v, font=f_small, fill=INK)
        y += 24

    right = [
        ("Solicitante", "Dr. R. MENDOZA  CMP 38221"),
        ("Orden", "2026-11-449120"),
        ("Muestra", "Suero / Sangre total"),
        ("Perfil", "Bioquimica + Hematologia"),
    ]
    y = 172
    for k, v in right:
        d.text((560, y), f"{k}:", font=f_small, fill=MUTED)
        d.text((665, y), v, font=f_small, fill=INK)
        y += 24

    d.line([60, 300, W - 60, 300], fill=RULE, width=1)

    d.text((60, 320), "DETERMINACION", font=f_head, fill=MUTED)
    d.text((520, 320), "RESULTADO", font=f_head, fill=MUTED)
    d.text((660, 320), "UNIDAD", font=f_head, fill=MUTED)
    d.text((810, 320), "REFERENCIA", font=f_head, fill=MUTED)
    d.line([60, 346, W - 60, 346], fill=RULE, width=1)

    y = 360
    for name, value, unit, ref in ROWS:
        d.text((60, y), name, font=f_row, fill=INK)
        d.text((520, y), value, font=f_row_b, fill=INK)
        d.text((660, y), unit, font=f_row, fill=INK)
        d.text((810, y), ref, font=f_row, fill=MUTED)
        y += 30

    d.line([60, y + 10, W - 60, y + 10], fill=RULE, width=1)

    d.text((60, y + 24), "Valores de referencia segun metodo. Los resultados deben interpretarse", font=f_note, fill=MUTED)
    d.text((60, y + 44), "junto con la evaluacion clinica del paciente.", font=f_note, fill=MUTED)

    d.text((60, H - 70), "Bioq. A. QUISPE  CTP 0912", font=f_small, fill=INK)
    d.text((60, H - 48), "Laboratorio Clinico San Rafael  ·  Pagina 1 de 1", font=f_note, fill=MUTED)

    band = Image.new("RGB", (W, 22), (238, 240, 236))
    img.paste(band, (0, H - 22))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {W}x{H})")


if __name__ == "__main__":
    main()
