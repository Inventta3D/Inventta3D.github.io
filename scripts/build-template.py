#!/usr/bin/env python3
"""Regenera o modelo codificado usado pelo gerador de imagem do orçamento."""
from base64 import b64encode
from pathlib import Path
root = Path(__file__).resolve().parents[1] / "site" / "app"
source = root / "whatsapp-template.html"
target = root / "templates" / "whatsapp-template.b64"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(b64encode(source.read_bytes()))
print(f"Modelo atualizado: {target.relative_to(root)}")
