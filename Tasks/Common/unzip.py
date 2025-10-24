"""Helper module to extract all zip files in a given folder"""

import os
from pathlib import Path

from zipfile import ZipFile

ENTRY_FOLDER = "./Entries"


def main():
    root = Path(ENTRY_FOLDER)
    for _, _, files in os.walk(ENTRY_FOLDER):
        for file in files:
            path = root / file

            if path.suffix != ".zip":
                continue

            if not path.exists():
                print(f"File {path} is in subfolder")
                continue

            with ZipFile(str(path)) as f:
                f.extractall(ENTRY_FOLDER)

            path.unlink()
            print(f"Extracted {path}")


if __name__ == "__main__":
    main()
