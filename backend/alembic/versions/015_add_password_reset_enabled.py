"""Add password_reset_enabled to global_settings

Revision ID: 015_add_password_reset_enabled
Revises: 014_add_webauthn_enforcement
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '015_add_password_reset_enabled'
down_revision = '014_add_webauthn_enforcement'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add password_reset_enabled column to global_settings table
    op.add_column('global_settings',
        sa.Column('password_reset_enabled', sa.Boolean(), nullable=False, server_default='1')
    )


def downgrade() -> None:
    # Remove password_reset_enabled column from global_settings table
    op.drop_column('global_settings', 'password_reset_enabled')
