"""Add icon column to applications table

Revision ID: 002
Revises: 001
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('applications', sa.Column('icon', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('applications', 'icon')
