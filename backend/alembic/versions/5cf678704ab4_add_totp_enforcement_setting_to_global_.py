"""Add TOTP enforcement setting to global settings

Revision ID: 5cf678704ab4
Revises: d633d3f1f735
Create Date: 2025-12-28 19:07:08.490721

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5cf678704ab4'
down_revision = 'd633d3f1f735'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add totp_enforcement column to global_settings table
    op.add_column('global_settings', sa.Column('totp_enforcement', sa.String(), nullable=False, server_default='optional'))


def downgrade() -> None:
    # Remove totp_enforcement column from global_settings table
    op.drop_column('global_settings', 'totp_enforcement')
