"""Add encryption support to SMTP passwords

Revision ID: 011_add_smtp_encryption
Revises: 010_add_oidc_state_table
Create Date: 2024-12-29 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '011_add_smtp_encryption'
down_revision = '010_add_oidc_state_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add encrypted column to track if password is encrypted (for migration purposes)
    op.add_column('smtp_config', sa.Column('password_encrypted', sa.Boolean(), default=False, nullable=False))


def downgrade() -> None:
    # Remove the encrypted column
    op.drop_column('smtp_config', 'password_encrypted')
