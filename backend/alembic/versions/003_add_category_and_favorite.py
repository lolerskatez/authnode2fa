"""Add category and favorite columns to applications table

Revision ID: 003_add_category_and_favorite
Revises: 002_add_app_icon
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_category_and_favorite'
down_revision = '002_add_app_icon'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Category and favorite columns already added in initial migration
    pass


def downgrade() -> None:
    op.drop_column('applications', 'category')
    op.drop_column('applications', 'favorite')