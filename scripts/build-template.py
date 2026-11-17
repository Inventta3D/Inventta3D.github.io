#!/usr/bin/env python3
"""Regenera o modelo codificado usado pelo gerador de imagem do orçamento."""
from base64 import b64encode
from pathlib import Path
root = Path(__file__).resolve().parents[1] / "site" / "app"
source = root / "whatsapp-template.html"
target = root / "templates" / "whatsapp-template.b64"
target.parent.mkdir(parents=True, exist_ok=True)
# sempre com quebras de linha Unix (LF): o git guarda o modelo assim (no Windows a cópia local tem CRLF),
# e o teste compara com o conteúdo normalizado
target.write_bytes(b64encode(source.read_bytes().replace(b"\r\n", b"\n")))
print(f"Modelo atualizado: {target.relative_to(root)}")
