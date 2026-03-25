"""Extracts all notes in database to target folder"""

import os
import sqlite3
from collections import defaultdict

from html_to_markdown import convert

TARGET_PATH = "D:/Development/Notezilla/notes"
DB_PATH = "./db.sqlite3"


def format_markdown(entry_slug: str, md_content: str) -> str:
    """Return the formatted markdown contents"""
    return f"---\ndate: {entry_slug}\ntags: [journal, paragraph]\n---\n{md_content}\n"


def extract_entries_to_markdown():
    """Execution of database export of paragraphs to markdown files"""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "SELECT entry_id, text FROM main_entryparagraph ORDER BY entry_id"
        )

        counts = defaultdict(int)

        for entry_id, text in cursor:
            year, month, day = entry_id.split("-")
            dir_path = os.path.join(TARGET_PATH, year, month, day)
            os.makedirs(dir_path, exist_ok=True)

            md_content = convert(text).strip()
            idx = counts[entry_id]
            counts[entry_id] += 1

            filename = f"p{idx}.md"
            filepath = os.path.join(dir_path, filename)

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(format_markdown(entry_id, md_content))

            print("Wrote", entry_id, filename)


if __name__ == "__main__":
    extract_entries_to_markdown()
