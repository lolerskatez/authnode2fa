"""Add webauthn_enabled to global_settings

Revision ID: 013_add_webauthn_enabled
Revises: 012_fix_smtp_config_columns
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013_add_webauthn_enabled'
down_revision = '012_fix_smtp_config_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add webauthn_enabled column to global_settings table
    op.add_column('global_settings',
        sa.Column('webauthn_enabled', sa.Boolean(), nullable=False, server_default='true')
    )


def downgrade() -> None:
    # Remove webauthn_enabled column from global_settings table
    op.drop_column('global_settings', 'webauthn_enabled')
