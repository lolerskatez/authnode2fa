"""Add account metadata and ordering fields

Revision ID: add_account_metadata_ordering
Revises: add_webauthn_support
Create Date: 2025-12-29 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_account_metadata_ordering'
down_revision = 'add_webauthn_support'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to applications table
    op.add_column('applications', sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('applications', sa.Column('username', sa.String(), nullable=True))
    op.add_column('applications', sa.Column('url', sa.String(), nullable=True))
    op.add_column('applications', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('applications', sa.Column('custom_fields', sa.JSON(), nullable=True))


def downgrade():
    # Remove the new columns from applications table
    op.drop_column('applications', 'custom_fields')
    op.drop_column('applications', 'notes')
    op.drop_column('applications', 'url')
    op.drop_column('applications', 'username')
    op.drop_column('applications', 'display_order')
