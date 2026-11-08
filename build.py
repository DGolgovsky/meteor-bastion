#!/usr/bin/env python3
"""Собрать Meteor Bastion из src/ в единый index.html (байт-в-байт как исходник).

Использование: python3 build.py   (из корня этого дерева)
Результат: index.html в корне. Собранный файл в репозиторий не коммитится
(см. .gitignore); правки вносятся только в src/, затем пересборка.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
PLACEHOLDER = b"<!-- __GAME_JS__ -->\n"


def main():
    order = []
    for line in (SRC / "order.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        order.append(line)
    js = b"".join((SRC / "js" / name).read_bytes() for name in order)
    shell = (SRC / "shell.html").read_bytes()
    if PLACEHOLDER not in shell:
        raise SystemExit("placeholder <!-- __GAME_JS__ --> not found in src/shell.html")
    out = shell.replace(PLACEHOLDER, js, 1)
    (ROOT / "index.html").write_bytes(out)
    print(f"built index.html: {len(out)} bytes from {len(order)} modules")


if __name__ == "__main__":
    main()
