from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import BinaryIO

import pandas as pd


PROJECT_DIR = Path(__file__).resolve().parent
DATA_DIR = PROJECT_DIR / "data"
SOURCE_FILE = DATA_DIR / "Flight Utilization Bell412.xlsx"
OUTPUT_FILE = PROJECT_DIR / "utilization_data.json"
JS_OUTPUT_FILE = PROJECT_DIR / "utilization_data.js"

AIRCRAFT = {
    "PK-OCA": {"model": "Bell 412 SP", "image": "bell412_sp.png"},
    "PK-OCD": {"model": "Bell 412 EP", "image": "bell412_ep.png"},
}


def round_number(value: float, decimals: int = 2) -> float:
    return round(float(value), decimals)


def source_name(source_file: Path | str | BinaryIO) -> str:
    if isinstance(source_file, (str, Path)):
        return Path(source_file).name

    return str(getattr(source_file, "name", "uploaded workbook"))


def process_utilization(source_file: Path | str | BinaryIO = SOURCE_FILE) -> dict:
    df = pd.read_excel(source_file, sheet_name="Sheet")
    df["Flight Date"] = pd.to_datetime(df["Flight Date"], errors="coerce").dt.normalize()
    df["FH"] = pd.to_numeric(df["FH"], errors="coerce").fillna(0)
    df["FC"] = pd.to_numeric(df["FC"], errors="coerce").fillna(0)

    df = df[df["Registration"].isin(AIRCRAFT)].copy()
    if df.empty:
        raise ValueError("No rows found for PK-OCA or PK-OCD.")

    year = int(df["Flight Date"].dropna().dt.year.mode().iloc[0])
    start_date = pd.Timestamp(year=year, month=1, day=1)
    end_date = pd.Timestamp(year=year, month=7, day=31)
    calendar_days = pd.date_range(start_date, end_date, freq="D")

    df = df[(df["Flight Date"] >= start_date) & (df["Flight Date"] <= end_date)].copy()

    daily = (
        df.groupby(["Registration", "Flight Date"], as_index=False)
        .agg(flight_hours=("FH", "sum"), flight_cycles=("FC", "sum"))
    )

    aircraft_calendar = pd.MultiIndex.from_product(
        [AIRCRAFT.keys(), calendar_days],
        names=["Registration", "Flight Date"],
    ).to_frame(index=False)

    daily_complete = aircraft_calendar.merge(
        daily,
        on=["Registration", "Flight Date"],
        how="left",
    ).fillna({"flight_hours": 0, "flight_cycles": 0})

    daily_complete["is_idle_day"] = (
        (daily_complete["flight_hours"] == 0) & (daily_complete["flight_cycles"] == 0)
    )
    daily_complete["month"] = daily_complete["Flight Date"].dt.strftime("%b")
    daily_complete["date"] = daily_complete["Flight Date"].dt.strftime("%Y-%m-%d")
    daily_complete["model"] = daily_complete["Registration"].map(
        lambda registration: AIRCRAFT[registration]["model"]
    )

    valid_dates = (
        daily_complete.groupby("date")
        .agg(flight_hours=("flight_hours", "sum"), flight_cycles=("flight_cycles", "sum"))
        .query("flight_hours > 0 or flight_cycles > 0")
        .reset_index()["date"]
        .tolist()
    )

    monthly = (
        daily_complete.groupby("month", sort=False)
        .agg(
            flight_hours=("flight_hours", "sum"),
            flight_cycles=("flight_cycles", "sum"),
            idle_days=("is_idle_day", "sum"),
        )
        .reset_index()
    )
    monthly["cumulative_fh"] = monthly["flight_hours"].cumsum()
    monthly["cumulative_fc"] = monthly["flight_cycles"].cumsum()

    monthly_by_aircraft = (
        daily_complete.groupby(["month", "Registration"], sort=False)
        .agg(
            flight_hours=("flight_hours", "sum"),
            flight_cycles=("flight_cycles", "sum"),
            idle_days=("is_idle_day", "sum"),
        )
        .reset_index()
    )

    aircraft_summary = (
        daily_complete.groupby("Registration")
        .agg(
            total_fh=("flight_hours", "sum"),
            total_fc=("flight_cycles", "sum"),
            active_days=("is_idle_day", lambda values: int((~values).sum())),
            idle_days=("is_idle_day", "sum"),
        )
        .reset_index()
    )
    aircraft_summary["model"] = aircraft_summary["Registration"].map(
        lambda registration: AIRCRAFT[registration]["model"]
    )
    aircraft_summary["image"] = aircraft_summary["Registration"].map(
        lambda registration: AIRCRAFT[registration]["image"]
    )
    aircraft_summary["avg_fh_per_day"] = aircraft_summary["total_fh"] / len(calendar_days)
    aircraft_summary["avg_fh_per_fc"] = aircraft_summary.apply(
        lambda row: row["total_fh"] / row["total_fc"] if row["total_fc"] else 0,
        axis=1,
    )

    total_fh = daily_complete["flight_hours"].sum()
    total_fc = daily_complete["flight_cycles"].sum()
    avg_fh_per_aircraft_calendar_day = aircraft_summary["avg_fh_per_day"].mean()
    combined_daily = (
        daily_complete.groupby("Flight Date")
        .agg(flight_hours=("flight_hours", "sum"), flight_cycles=("flight_cycles", "sum"))
        .reset_index()
    )
    combined_idle_calendar_days = int(
        ((combined_daily["flight_hours"] == 0) & (combined_daily["flight_cycles"] == 0)).sum()
    )

    return {
        "sourceFile": source_name(source_file),
        "window": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
            "calendarDays": len(calendar_days),
            "aircraftDays": len(calendar_days) * len(AIRCRAFT),
        },
        "kpis": {
            "totalFH": round_number(total_fh, 1),
            "totalFC": int(total_fc),
            "avgFHPerCalendarDay": round_number(avg_fh_per_aircraft_calendar_day, 2),
            "avgFHPerFlightCycle": round_number(total_fh / total_fc, 2) if total_fc else 0,
            "idleDaysByAircraft": {
                row["Registration"]: int(row["idle_days"])
                for _, row in aircraft_summary.iterrows()
            },
            "combinedIdleCalendarDays": combined_idle_calendar_days,
        },
        "validDates": valid_dates,
        "dailyByAircraft": [
            {
                "date": row["date"],
                "month": row["month"],
                "registration": row["Registration"],
                "model": row["model"],
                "flightHours": round_number(row["flight_hours"], 1),
                "flightCycles": int(row["flight_cycles"]),
                "isIdleDay": bool(row["is_idle_day"]),
            }
            for _, row in daily_complete.iterrows()
        ],
        "monthly": [
            {
                "month": row["month"],
                "flightHours": round_number(row["flight_hours"], 1),
                "flightCycles": int(row["flight_cycles"]),
                "idleDays": int(row["idle_days"]),
                "cumulativeFH": round_number(row["cumulative_fh"], 1),
                "cumulativeFC": int(row["cumulative_fc"]),
            }
            for _, row in monthly.iterrows()
        ],
        "monthlyByAircraft": [
            {
                "month": row["month"],
                "registration": row["Registration"],
                "model": AIRCRAFT[row["Registration"]]["model"],
                "flightHours": round_number(row["flight_hours"], 1),
                "flightCycles": int(row["flight_cycles"]),
                "idleDays": int(row["idle_days"]),
            }
            for _, row in monthly_by_aircraft.iterrows()
        ],
        "aircraft": [
            {
                "registration": row["Registration"],
                "model": row["model"],
                "image": row["image"],
                "totalFH": round_number(row["total_fh"], 1),
                "totalFC": int(row["total_fc"]),
                "avgFHPerDay": round_number(row["avg_fh_per_day"], 2),
                "avgFHPerFlightCycle": round_number(row["avg_fh_per_fc"], 2),
                "activeDays": int(row["active_days"]),
                "idleDays": int(row["idle_days"]),
            }
            for _, row in aircraft_summary.iterrows()
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build aircraft utilization dashboard data.")
    parser.add_argument(
        "--source",
        type=Path,
        default=SOURCE_FILE,
        help="Path to the flight utilization Excel workbook. Defaults to data/Flight Utilization Bell412.xlsx.",
    )
    args = parser.parse_args()

    if not args.source.exists():
        raise FileNotFoundError(
            f"Workbook not found: {args.source}. Upload it in Streamlit, or place it under the local data/ "
            "folder for offline regeneration. Do not commit confidential workbooks."
        )

    result = process_utilization(args.source)
    OUTPUT_FILE.write_text(json.dumps(result, indent=2), encoding="utf-8")
    JS_OUTPUT_FILE.write_text(
        "window.UTILIZATION_DATA = "
        + json.dumps(result, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "jsonOutput": str(OUTPUT_FILE),
                "jsOutput": str(JS_OUTPUT_FILE),
                "validDates": len(result["validDates"]),
                "dailyRows": len(result["dailyByAircraft"]),
                "totalFH": result["kpis"]["totalFH"],
                "totalFC": result["kpis"]["totalFC"],
                "idleDaysByAircraft": result["kpis"]["idleDaysByAircraft"],
            },
            indent=2,
        )
    )
