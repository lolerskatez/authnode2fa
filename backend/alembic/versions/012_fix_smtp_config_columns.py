"""Add missing columns to smtp_config table

Revision ID: 012_fix_smtp_config_columns
Revises: 011_add_smtp_encryption
Create Date: 2024-12-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '012_fix_smtp_config_columns'
down_revision = '011_add_smtp_encryption'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to smtp_config
    op.add_column('smtp_config', sa.Column('from_name', sa.String(), server_default='SecureAuth', nullable=False))
    op.add_column('smtp_config', sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.add_column('smtp_config', sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))


def downgrade() -> None:
    # Remove the added columns
    op.drop_column('smtp_config', 'updated_at')
    op.drop_column('smtp_config', 'created_at')
    op.drop_column('smtp_config', 'from_name')
