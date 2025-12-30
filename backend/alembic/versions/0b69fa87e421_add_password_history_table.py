"""add_password_history_table

Revision ID: 0b69fa87e421
Revises: 0061ffa92cb8
Create Date: 2025-12-29 03:19:06.332310

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0b69fa87e421'
down_revision = '0061ffa92cb8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create password_history table
    op.create_table('password_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_history_id'), 'password_history', ['id'], unique=False)
    op.create_index(op.f('ix_password_history_user_id'), 'password_history', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop password_history table
    op.drop_index(op.f('ix_password_history_user_id'), table_name='password_history')
    op.drop_index(op.f('ix_password_history_id'), table_name='password_history')
    op.drop_table('password_history')
