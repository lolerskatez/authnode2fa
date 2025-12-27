"""Add color column to applications table

Revision ID: 004
Revises: 003
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('applications', sa.Column('color', sa.String(), nullable=True, default='#6B46C1'))


def downgrade() -> None:
    op.drop_column('applications', 'color')