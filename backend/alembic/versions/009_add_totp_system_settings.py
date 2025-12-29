"""Add TOTP system settings

Revision ID: 009_add_totp_system_settings
Revises: 5cf678704ab4
Create Date: 2025-12-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009_add_totp_system_settings'
down_revision = '5cf678704ab4'
branch_labels = None
depends_on = None


def upgrade():
    # Add totp_enabled column (default False - system disabled by default)
    op.add_column('global_settings', sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default='0'))
    
    # Add totp_grace_period_days column (default 7 days)
    op.add_column('global_settings', sa.Column('totp_grace_period_days', sa.Integer(), nullable=False, server_default='7'))


def downgrade():
    op.drop_column('global_settings', 'totp_grace_period_days')
    op.drop_column('global_settings', 'totp_enabled')
