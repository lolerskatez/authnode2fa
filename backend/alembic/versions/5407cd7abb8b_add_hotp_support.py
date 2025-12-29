"""add_hotp_support

Revision ID: 5407cd7abb8b
Revises: 015_add_password_reset_enabled
Create Date: 2025-12-29 03:10:39.251517

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5407cd7abb8b'
down_revision = '015_add_password_reset_enabled'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add otp_type and counter columns to applications table
    op.add_column('applications', sa.Column('otp_type', sa.String(), nullable=False, server_default='TOTP'))
    op.add_column('applications', sa.Column('counter', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Remove otp_type and counter columns from applications table
    op.drop_column('applications', 'counter')
    op.drop_column('applications', 'otp_type')
