"""Add color column to applications table

Revision ID: 004_add_color_column
Revises: 003_add_category_and_favorite
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_add_color_column'
down_revision = '003_add_category_and_favorite'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Color column already added in initial migration
    pass


def downgrade() -> None:
    op.drop_column('applications', 'color')