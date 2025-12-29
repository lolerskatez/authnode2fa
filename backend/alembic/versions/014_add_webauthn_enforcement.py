"""Add webauthn_enforcement to global_settings

Revision ID: 014_add_webauthn_enforcement
Revises: ['013_add_webauthn_enabled', 'add_account_metadata_ordering']
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '014_add_webauthn_enforcement'
down_revision = ['013_add_webauthn_enabled', 'add_account_metadata_ordering']
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add webauthn_enforcement column to global_settings table
    op.add_column('global_settings',
        sa.Column('webauthn_enforcement', sa.String(), nullable=False, server_default='optional')
    )


def downgrade() -> None:
    # Remove webauthn_enforcement column from global_settings table
    op.drop_column('global_settings', 'webauthn_enforcement')
