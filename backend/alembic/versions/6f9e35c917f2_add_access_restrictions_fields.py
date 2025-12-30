"""add_access_restrictions_fields

Revision ID: 6f9e35c917f2
Revises: 9a38e7e80f9c
Create Date: 2025-12-30 00:27:24.255671

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6f9e35c917f2'
down_revision = '9a38e7e80f9c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add access restriction fields to global_settings table
    op.add_column('global_settings', sa.Column('ip_restrictions_enabled', sa.Boolean(), nullable=True, default=False))
    op.add_column('global_settings', sa.Column('allowed_ip_ranges', sa.JSON(), nullable=True, default=[]))
    op.add_column('global_settings', sa.Column('blocked_ip_ranges', sa.JSON(), nullable=True, default=[]))
    op.add_column('global_settings', sa.Column('geo_restrictions_enabled', sa.Boolean(), nullable=True, default=False))
    op.add_column('global_settings', sa.Column('allowed_countries', sa.JSON(), nullable=True, default=[]))
    op.add_column('global_settings', sa.Column('blocked_countries', sa.JSON(), nullable=True, default=[]))


def downgrade() -> None:
    # Remove access restriction fields from global_settings table
    op.drop_column('global_settings', 'blocked_countries')
    op.drop_column('global_settings', 'allowed_countries')
    op.drop_column('global_settings', 'geo_restrictions_enabled')
    op.drop_column('global_settings', 'blocked_ip_ranges')
    op.drop_column('global_settings', 'allowed_ip_ranges')
    op.drop_column('global_settings', 'ip_restrictions_enabled')
