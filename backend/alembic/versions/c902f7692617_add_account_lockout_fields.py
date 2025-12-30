"""add_account_lockout_fields

Revision ID: c902f7692617
Revises: 0b69fa87e421
Create Date: 2025-12-30 00:24:11.314082

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c902f7692617'
down_revision = '0b69fa87e421'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add account lockout fields to users table
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=True, default=0))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('last_failed_login', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove account lockout fields from users table
    op.drop_column('users', 'last_failed_login')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
