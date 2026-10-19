#!/usr/bin/env python3
"""Build the lightweight study catalog using only the headers of lesson HTML files."""
import argparse
import datetime
import json
import re
from html.parser import HTMLParser
from pathlib import Path

SUBJECTS = {"english", "japanese", "general", "wgl"}
TYPE_ALIASES = {"文法": "grammar", "语法": "grammar", "word": "vocabulary", "词汇": "vocabulary", "练习": "quiz", "笔记": "notes", "写作": "writing", "参考": "reference"}
TYPES = {"grammar", "vocabulary", "quiz", "notes", "writing", "reference"}


class HeaderParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts = []
        self.in_title = False
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            attrs = dict(attrs)
            name = (attrs.get("name") or "").lower()
            if name in {"description", "course", "subject", "type", "date", "lesson-number"}:
                self.meta[name] = (attrs.get("content") or "").strip()

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)


def read_header(path):
    text = ""
    with path.open(encoding="utf-8-sig", errors="replace") as source:
        while len(text) < 262144:
            chunk = source.read(16384)
            if not chunk:
                break
            text += chunk
            end = re.search(r"</head\s*>", text, re.I)
            if end:
                text = text[:end.end()]
                break
    parser = HeaderParser()
    parser.feed(text)
    return "".join(parser.title_parts).strip(), parser.meta


def guess_type(value):
    text = value.lower()
    groups = [
        ("writing", ("writing", "写作", "paragraphs")),
        ("grammar", ("grammar", "文法", "语法", "tenses")),
        ("vocabulary", ("vocab", "word", "词汇", "単語", "单词")),
        ("quiz", ("quiz", "questions", "练习", "自测")),
        ("notes", ("note", "summary", "笔记", "知识点", "知识整理")),
    ]
    return next((kind for kind, keys in groups if any(key in text for key in keys)), "reference")


def guess_course(path, kind):
    text = path.lower()
    if "toeic" in text:
        return "TOEIC"
    if kind == "writing":
        return "英语写作"
    if "reading" in text or "阅读" in text or "阅" in text:
        return "阅读"
    if "phonetic" in text:
        return "发音学"
    if kind == "grammar":
        return "英语文法"
    if "english" in text:
        return "英语"
    return "未分类"


def date_or_empty(value):
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return datetime.date.fromisoformat(value).isoformat()
    except ValueError:
        pass
    return ""


def make_item(path, root, overrides):
    relative = path.relative_to(root).as_posix()
    title, meta = read_header(path)
    guessed_title = re.sub(r"[-_]", " ", path.stem)
    kind = TYPE_ALIASES.get(meta.get("type", "").lower(), meta.get("type", "").lower())
    kind = kind if kind in TYPES else guess_type(relative + " " + title)
    subject = meta.get("subject", relative.split("/")[1] if len(relative.split("/")) > 2 else "general").lower()
    subject = subject if subject in SUBJECTS else "general"
    lesson_match = re.search(r"(?:第\s*|\bDS|chapter)(\d+)", relative, re.I)
    lesson = meta.get("lesson-number") or (lesson_match.group(1) if lesson_match else None)
    item = {
        "path": relative, "title": title or guessed_title,
        "description": "" if kind == "vocabulary" else meta.get("description", ""),
        "subject": subject, "type": kind, "course": meta.get("course") or guess_course(relative, kind),
        "date": date_or_empty(meta.get("date", "")), "lessonNumber": int(lesson) if lesson and str(lesson).isdigit() else None,
    }
    override = overrides.get(relative, {})
    if override.get("hidden"):
        return None
    for key in item.keys() - {"path"}:
        if key in override:
            item[key] = override[key]
    if item["subject"] not in SUBJECTS or item["type"] not in TYPES:
        raise ValueError(f"Invalid classification: {relative}")
    badges = override.get("badges", [])
    item["badges"] = []
    if badges:
        if not isinstance(badges, list) or not all(isinstance(b, str) and b.strip() for b in badges):
            raise ValueError(f"Invalid badges: {relative}")
        item["badges"] = [b.strip() for b in badges]
    item["date"] = date_or_empty(str(item["date"]))
    if not item["title"] or not item["course"]:
        raise ValueError(f"Missing catalog metadata: {relative}")
    return item


def get_existing_added_orders(catalog_path):
    """Keep each file's original position when rebuilding the catalog."""
    if not catalog_path.exists():
        return {}
    previous = json.loads(catalog_path.read_text(encoding="utf-8"))
    orders = {}
    for index, item in enumerate(previous.get("materials", []), start=1):
        path = item.get("path")
        order = item.get("addedOrder")
        if isinstance(path, str) and path:
            orders[path] = order if isinstance(order, int) and order > 0 else index
    return orders


def build_catalog(root, overrides, existing_orders=None):
    roots = sorted((p for p in root.iterdir() if p.is_dir() and re.fullmatch(r"\d{2}(aut|spring)", p.name)), key=lambda p: (int(p.name[:2]), p.name.endswith("aut")), reverse=True)
    if not roots:
        raise ValueError("No semester folders found")
    semesters = [{"id": p.name, "label": f"20{p.name[:2]} {'秋' if p.name.endswith('aut') else '春'}学期"} for p in roots]
    items = []
    existing_orders = existing_orders or {}
    next_added_order = max(existing_orders.values(), default=0)
    for semester in roots:
        for path in sorted(semester.rglob("*")):
            if path.is_file() and path.suffix.lower() == ".html":
                item = make_item(path, root, overrides)
                if item:
                    order = existing_orders.get(item["path"])
                    if order is None:
                        next_added_order += 1
                        order = next_added_order
                    item["addedOrder"] = order
                    items.append(item)
    return {"version": 1, "currentSemester": roots[0].name, "semesters": semesters, "materials": items}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--overrides", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    override_path = args.overrides or args.root / "catalog-overrides.json"
    overrides = json.loads(override_path.read_text(encoding="utf-8")) if override_path.exists() else {}
    target = args.output or args.root / "materials.json"
    catalog = build_catalog(args.root.resolve(), overrides, get_existing_added_orders(target))
    target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(catalog['materials'])} materials across {len(catalog['semesters'])} semesters ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
