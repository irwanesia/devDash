"""Logika ulang tagihan — paritas dengan frontend (reminderService.tambahPeriode)."""
import calendar
from datetime import date


def tambah_periode(tanggal: str, aturan: str) -> str:
    y, m, d = (int(x) for x in tanggal.split("-"))
    dt = date(y, m, d)
    if aturan == "mingguan":
        return (dt.fromordinal(dt.toordinal() + 7)).isoformat()
    if aturan == "bulanan":
        nm = dt.month + 1
        ny = dt.year + (1 if nm > 12 else 0)
        nm = 1 if nm > 12 else nm
        maks = calendar.monthrange(ny, nm)[1]
        return date(ny, nm, min(dt.day, maks)).isoformat()
    if aturan == "tahunan":
        try:
            return date(dt.year + 1, dt.month, dt.day).isoformat()
        except ValueError:
            # 29 Feb -> 28 Feb tahun biasa
            maks = calendar.monthrange(dt.year + 1, dt.month)[1]
            return date(dt.year + 1, dt.month, min(dt.day, maks)).isoformat()
    return tanggal
