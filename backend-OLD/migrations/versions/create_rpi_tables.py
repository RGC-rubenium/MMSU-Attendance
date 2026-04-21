"""Create RPI device tables

Revision ID: create_rpi_tables
Create Date: 2026-04-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'create_rpi_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create rpi_devices table
    op.create_table('rpi_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(50), nullable=False),
        sa.Column('device_name', sa.String(100), nullable=False),
        sa.Column('mac_address', sa.String(17), nullable=True),
        sa.Column('ip_address', sa.String(15), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('is_paired', sa.Boolean(), default=False),
        sa.Column('is_online', sa.Boolean(), default=False),
        sa.Column('last_heartbeat', sa.DateTime(), nullable=True),
        sa.Column('pairing_code', sa.String(10), nullable=True),
        sa.Column('pairing_expires', sa.DateTime(), nullable=True),
        sa.Column('config_data', postgresql.JSON(), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), default=True),
        sa.Column('scanner_mode', sa.String(20), default='both'),
        sa.Column('paired_at', sa.DateTime(), nullable=True),
        sa.Column('paired_by', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_id'),
        schema='attendance'
    )
    
    # Create index on device_id for faster lookups
    op.create_index('ix_rpi_devices_device_id', 'rpi_devices', ['device_id'], schema='attendance')
    
    # Create pairing_requests table
    op.create_table('pairing_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(50), nullable=False),
        sa.Column('device_name', sa.String(100), nullable=False),
        sa.Column('mac_address', sa.String(17), nullable=True),
        sa.Column('ip_address', sa.String(15), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('pairing_code', sa.String(10), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('reviewed_by', sa.String(50), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        schema='attendance'
    )
    
    # Create indexes
    op.create_index('ix_pairing_requests_device_id', 'pairing_requests', ['device_id'], schema='attendance')
    op.create_index('ix_pairing_requests_status', 'pairing_requests', ['status'], schema='attendance')
    op.create_index('ix_pairing_requests_pairing_code', 'pairing_requests', ['pairing_code'], schema='attendance')


def downgrade():
    op.drop_index('ix_pairing_requests_pairing_code', table_name='pairing_requests', schema='attendance')
    op.drop_index('ix_pairing_requests_status', table_name='pairing_requests', schema='attendance')
    op.drop_index('ix_pairing_requests_device_id', table_name='pairing_requests', schema='attendance')
    op.drop_table('pairing_requests', schema='attendance')
    
    op.drop_index('ix_rpi_devices_device_id', table_name='rpi_devices', schema='attendance')
    op.drop_table('rpi_devices', schema='attendance')
