"""Add signup_enabled to global_settings

Revision ID: 008_add_signup_enabled
Revises: 007_add_sso_support
Create Date: 2025-12-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '008_add_signup_enabled'
down_revision = '007_add_sso_support'
branch_labels = None
depends_on = None


def upgrade():
    # Add signup_enabled column to global_settings table
    # SQLite requires special handling for columns that may already exist
    try:
        op.add_column('global_settings',
            sa.Column('signup_enabled', sa.Boolean(), nullable=False, server_default='1')
        )
    except Exception:
        # Column may already exist, continue
        pass


def downgrade():
    # Remove signup_enabled column
    try:
        op.drop_column('global_settings', 'signup_enabled')
    except Exception:
        # Column may not exist, continue
        pass
