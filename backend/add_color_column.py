from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE applications ADD COLUMN color TEXT DEFAULT '#6B46C1'"))
    conn.commit()
    print('Color column added successfully')