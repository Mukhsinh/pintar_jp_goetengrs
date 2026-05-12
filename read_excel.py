import pandas as pd

f = r"d:\Aplikasi Antigravity\JASPEL\materi KPI\Cth Perhitungan Jasa Pelayanan & Remunerasi.xlsx"

try:
    xl = pd.ExcelFile(f)
    for sheet in xl.sheet_names:
        print(f"Sheet: {sheet}")
        df = xl.parse(sheet, nrows=100)
        print(df.head(10))
        # Search for names or grades
        for col in df.columns:
            if any(x in str(col).lower() for x in ['nama', 'gol', 'grade']):
                print(f"Found column {col} in sheet {sheet}")
except Exception as e:
    print(f"Error: {e}")
