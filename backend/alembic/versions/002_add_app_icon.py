"""Add icon column to applications table

Revision ID: 002_add_app_icon
Revises: 001_initial
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_app_icon'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Icon column already added in initial migration
    pass


def downgrade() -> None:
    op.drop_column('applications', 'icon')
