"""Add settings column to users table

Revision ID: 005
Revises: 004
Create Date: 2025-12-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('settings', sa.JSON(), nullable=True, server_default='{"theme": "light", "autoLock": 5, "codeFormat": "spaced"}'))


def downgrade() -> None:
    op.drop_column('users', 'settings')
