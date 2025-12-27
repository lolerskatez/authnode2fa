"""Add settings column to users table

Revision ID: 005_add_settings_column
Revises: 004_add_color_column
Create Date: 2025-12-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_add_settings_column'
down_revision = '004_add_color_column'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Settings column already added in initial migration
    pass


def downgrade() -> None:
    op.drop_column('users', 'settings')
