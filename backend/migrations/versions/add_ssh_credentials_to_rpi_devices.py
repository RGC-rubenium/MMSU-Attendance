"""Add SSH credentials columns to rpi_devices table

Revision ID: add_ssh_credentials
Revises: 
Create Date: 2026-04-04

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_ssh_credentials'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add SSH credential columns to rpi_devices table"""
    # Add ssh_username column
    op.add_column(
        'rpi_devices',
        sa.Column('ssh_username', sa.String(50), nullable=True),
        schema='attendance'
    )
    
    # Add ssh_password column
    op.add_column(
        'rpi_devices',
        sa.Column('ssh_password', sa.String(255), nullable=True),
        schema='attendance'
    )
    
    # Add ssh_port column with default value 22
    op.add_column(
        'rpi_devices',
        sa.Column('ssh_port', sa.Integer, nullable=True, server_default='22'),
        schema='attendance'
    )


def downgrade():
    """Remove SSH credential columns from rpi_devices table"""
    op.drop_column('rpi_devices', 'ssh_port', schema='attendance')
    op.drop_column('rpi_devices', 'ssh_password', schema='attendance')
    op.drop_column('rpi_devices', 'ssh_username', schema='attendance')
