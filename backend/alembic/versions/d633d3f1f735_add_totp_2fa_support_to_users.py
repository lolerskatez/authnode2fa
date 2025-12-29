"""Add TOTP 2FA support to users

Revision ID: d633d3f1f735
Revises: 008_add_signup_enabled
Create Date: 2025-12-28 19:02:43.844244

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd633d3f1f735'
down_revision = '008_add_signup_enabled'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add TOTP columns to users table
    op.add_column('users', sa.Column('totp_secret', sa.String(), nullable=True))
    op.add_column('users', sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Remove TOTP columns from users table
    op.drop_column('users', 'totp_enabled')
    op.drop_column('users', 'totp_secret')
