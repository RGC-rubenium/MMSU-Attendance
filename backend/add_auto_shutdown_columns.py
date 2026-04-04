"""
Migration script to add auto-shutdown columns to rpi_devices table
Run with: python add_auto_shutdown_columns.py
"""

import psycopg2
import config

def add_columns():
    """Add auto_shutdown_enabled and auto_shutdown_time columns to rpi_devices table"""
    
    # Parse the database URL
    db_url = config.SQLALCHEMY_DATABASE_URI
    
    # Connect to the database
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    try:
        # Check if columns already exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'attendance' 
            AND table_name = 'rpi_devices'
            AND column_name IN ('auto_shutdown_enabled', 'auto_shutdown_time')
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        
        # Add auto_shutdown_enabled column if it doesn't exist
        if 'auto_shutdown_enabled' not in existing_columns:
            print("Adding auto_shutdown_enabled column...")
            cur.execute("""
                ALTER TABLE attendance.rpi_devices 
                ADD COLUMN auto_shutdown_enabled BOOLEAN DEFAULT FALSE
            """)
            print("✓ auto_shutdown_enabled column added")
        else:
            print("✓ auto_shutdown_enabled column already exists")
        
        # Add auto_shutdown_time column if it doesn't exist
        if 'auto_shutdown_time' not in existing_columns:
            print("Adding auto_shutdown_time column...")
            cur.execute("""
                ALTER TABLE attendance.rpi_devices 
                ADD COLUMN auto_shutdown_time VARCHAR(5) NULL
            """)
            print("✓ auto_shutdown_time column added")
        else:
            print("✓ auto_shutdown_time column already exists")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    add_columns()
