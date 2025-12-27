"""Add category and favorite columns to applications table

Revision ID: 003
Revises: 002
Create Date: 2025-12-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('applications', sa.Column('category', sa.String(), nullable=True, default='Personal'))
    op.add_column('applications', sa.Column('favorite', sa.Boolean(), nullable=True, default=False))


def downgrade() -> None:
    op.drop_column('applications', 'category')
    op.drop_column('applications', 'favorite')