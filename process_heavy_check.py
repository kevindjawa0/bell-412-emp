from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import BinaryIO

import pandas as pd


PROJECT_DIR = Path(__file__).resolve().parent
OUTPUT_JSON = PROJECT_DIR / "heavy_check_data.json"
OUTPUT_JS = PROJECT_DIR / "heavy_check_data.js"
MASTER_SHEET = "CONTROL SHEET - CTRL TASK CARD"

STANDARD_COLUMNS = {
    "NO": "source_no",
    "TASK CARD NO": "task_card_no",
    "ATA": "ata",
    "TRADE": "trade",
    "QTY": "quantity",
    "PHASE": "phase",
    "TASK CODE": "task_code",
    "SEQ": "sequence",
    "OCA MHR": "planned_mh",
    "ACTUAL MHR": "actual_mh",
    "Fill 1 If Closed": "closed_flag",
    "REF MM": "ref_mm",
    "REF DMC": "ref_dmc",
    "TASK STS": "task_status",
    "TASK DESCRIPTION": "description",
    "INTERVAL": "interval",
    "A/C REG": "aircraft_registration",
}


def source_name(source_file: Path | str | BinaryIO) -> str:
    if isinstance(source_file, (str, Path)):
        return Path(source_file).name
    return str(getattr(source_file, "name", "uploaded workbook"))


def empty_heavy_check_payload() -> dict[str, object]:
    return {
        "sourceFile": "",
        "sourceSheet": MASTER_SHEET,
        "sheets": [],
        "tasks": [],
        "summary": {
            "totalTasks": 0,
            "validTasks": 0,
            "tasksWithErrors": 0,
            "tasksWithWarnings": 0,
            "missingManHours": 0,
            "knownManHours": 0.0,
            "workloadCoverage": 0.0,
        },
    }


def normalize_blank(value: object) -> str:
    text = str(value if value is not None else "").strip()
    if not text or re.fullmatch(r"(?:NA|N/A|NIL|NONE|-|--|#N/A)", text, flags=re.I):
        return ""
    return re.sub(r"\s+", " ", text)


def normalize_key(value: object) -> str:
    return re.sub(r"[^A-Z0-9]+", "", str(value or "").upper())


def normalize_ata(value: object) -> str:
    text = normalize_blank(value).upper().replace("ATA ", "")
    if re.fullmatch(r"\d+(?:\.0)?", text):
        return str(int(float(text))).zfill(2)
    return text


def normalize_trade(value: object) -> str:
    return re.sub(r"\s*/\s*", " / ", normalize_blank(value).upper())


def normalize_phase(value: object) -> str:
    return re.sub(r"^PHASE\s*", "P", normalize_blank(value).upper())


def normalize_aircraft_registration(value: object) -> str:
    text = normalize_blank(value).upper().replace(" ", "")
    if text in {"OCA", "PKOCA"}:
        return "PK-OCA"
    if text in {"OCD", "PKOCD"}:
        return "PK-OCD"
    return re.sub(r"^PK([A-Z])", r"PK-\1", text)


def numeric_or_none(value: object) -> float | None:
    text = normalize_blank(value).replace(",", "")
    if not text:
        return None
    numeric = pd.to_numeric(text, errors="coerce")
    if pd.isna(numeric):
        return None
    return float(numeric)


def is_heavy_check_interval(value: object) -> bool:
    text = normalize_blank(value).upper()
    return bool(re.search(r"5000|5\s*YEAR|5\s*YR|1825", text))


def standardize_columns(columns: list[object]) -> dict[object, str]:
    wanted = {normalize_key(source): target for source, target in STANDARD_COLUMNS.items()}
    return {column: wanted[normalize_key(column)] for column in columns if normalize_key(column) in wanted}


def make_task_uid(source_file: str, source_sheet: str, source_row: int, task_card_no: str, source_no: str) -> str:
    seed = f"{source_file}|{source_sheet}|{source_row}|{task_card_no}|{source_no}"
    return hashlib.sha1(seed.encode("utf-8")).hexdigest()[:16]


def validate_task(task: dict[str, object], task_card_counts: dict[str, int]) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []

    if not task["task_card_no"]:
        errors.append("Missing task-card number")
    if not task["ata"]:
        errors.append("Missing ATA chapter")
    if not task["description"]:
        errors.append("Missing task description")
    if not task["phase"]:
        errors.append("Missing phase")
    if not task["trade"]:
        errors.append("Missing trade")
    if task["sequence"] is None:
        errors.append("Missing sequence")
    if task["planned_mh"] is None:
        errors.append("Missing or invalid OCA man-hours")
    if task["planned_mh"] is not None and task["planned_mh"] < 0:
        errors.append("Negative man-hours")
    if not is_heavy_check_interval(task["interval"]):
        errors.append("Invalid heavy-check interval")

    if task["planned_mh"] == 0:
        warnings.append("Zero man-hours")
    if not task["ref_mm"]:
        warnings.append("Missing maintenance-manual reference")
    if not task["ref_dmc"]:
        warnings.append("Missing DMC reference")
    if "/" in str(task["trade"]) or "&" in str(task["trade"]):
        warnings.append("Combined trade")
    if re.search(r"SUMMARY|GENERAL|INSPECTION PROGRAM", str(task["description"]), flags=re.I):
        warnings.append("Possible summary inspection task")
    if task["task_card_no"] and task_card_counts.get(str(task["task_card_no"]), 0) > 1:
        warnings.append("Duplicate task-card number requires review")

    status = "error" if errors else "warning" if warnings else "valid"
    return {
        **task,
        "validation_status": status,
        "validation_message": "; ".join(errors + warnings),
        "errors": errors,
        "warnings": warnings,
    }


def build_summary(tasks: list[dict[str, object]]) -> dict[str, object]:
    known_mh = sum(float(task["planned_mh"] or 0) for task in tasks)
    known_count = sum(1 for task in tasks if task["planned_mh"] is not None)
    total = len(tasks)
    return {
        "totalTasks": total,
        "validTasks": sum(1 for task in tasks if task["validation_status"] == "valid"),
        "tasksWithErrors": sum(1 for task in tasks if task["validation_status"] == "error"),
        "tasksWithWarnings": sum(1 for task in tasks if task["validation_status"] == "warning"),
        "missingManHours": sum(1 for task in tasks if task["planned_mh"] is None),
        "knownManHours": round(known_mh, 1),
        "workloadCoverage": round((known_count / total) * 100, 1) if total else 0.0,
    }


def process_heavy_check(source_file: Path | str | BinaryIO) -> dict[str, object]:
    workbook = pd.ExcelFile(source_file, engine="openpyxl")
    if MASTER_SHEET not in workbook.sheet_names:
        raise ValueError(f'Required master sheet "{MASTER_SHEET}" was not found.')

    source_file_name = source_name(source_file)
    raw = pd.read_excel(workbook, sheet_name=MASTER_SHEET, dtype=object)
    rename_map = standardize_columns(list(raw.columns))
    df = raw.rename(columns=rename_map)
    missing_columns = [column for column in STANDARD_COLUMNS.values() if column not in df.columns]
    for column in missing_columns:
        df[column] = None

    tasks: list[dict[str, object]] = []
    for index, row in df.reset_index(drop=True).iterrows():
        if not any(normalize_blank(row.get(column)) for column in STANDARD_COLUMNS.values()):
            continue

        task_card_no = normalize_blank(row.get("task_card_no")).upper()
        source_no = normalize_blank(row.get("source_no"))
        source_row = int(index) + 2
        tasks.append(
            {
                "task_uid": make_task_uid(source_file_name, MASTER_SHEET, source_row, task_card_no, source_no),
                "source_file": source_file_name,
                "source_sheet": MASTER_SHEET,
                "source_row": source_row,
                "source_no": source_no,
                "task_card_no": task_card_no,
                "ata": normalize_ata(row.get("ata")),
                "trade": normalize_trade(row.get("trade")),
                "quantity": numeric_or_none(row.get("quantity")),
                "phase": normalize_phase(row.get("phase")),
                "task_code": normalize_blank(row.get("task_code")).upper(),
                "sequence": numeric_or_none(row.get("sequence")),
                "planned_mh": numeric_or_none(row.get("planned_mh")),
                "actual_mh": numeric_or_none(row.get("actual_mh")),
                "closed_flag": normalize_blank(row.get("closed_flag")).upper(),
                "ref_mm": normalize_blank(row.get("ref_mm")).upper(),
                "ref_dmc": normalize_blank(row.get("ref_dmc")).upper(),
                "task_status": normalize_blank(row.get("task_status")).upper(),
                "description": normalize_blank(row.get("description")),
                "interval": normalize_blank(row.get("interval")).upper(),
                "aircraft_registration": normalize_aircraft_registration(row.get("aircraft_registration")),
            }
        )

    counts = pd.Series([task["task_card_no"] for task in tasks if task["task_card_no"]]).value_counts().to_dict()
    validated = [validate_task(task, counts) for task in tasks]
    return {
        "sourceFile": source_file_name,
        "sourceSheet": MASTER_SHEET,
        "sheets": workbook.sheet_names,
        "tasks": validated,
        "summary": build_summary(validated),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build 5000-hour heavy-check task-master data.")
    parser.add_argument("--source", type=Path, required=True, help="Path to the 5000-hour heavy-check workbook.")
    args = parser.parse_args()
    result = process_heavy_check(args.source)
    OUTPUT_JSON.write_text(json.dumps(result, indent=2), encoding="utf-8")
    OUTPUT_JS.write_text("window.HEAVY_CHECK_DATA = " + json.dumps(result, indent=2) + ";\n", encoding="utf-8")
    print(json.dumps(result["summary"], indent=2))


if __name__ == "__main__":
    main()
