"""add_code_generation_history_table

Revision ID: 9a38e7e80f9c
Revises: c902f7692617
Create Date: 2025-12-30 00:26:08.993990

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a38e7e80f9c'
down_revision = 'c902f7692617'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create code_generation_history table
    op.create_table('code_generation_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_code_generation_history_application_id'), 'code_generation_history', ['application_id'], unique=False)
    op.create_index(op.f('ix_code_generation_history_generated_at'), 'code_generation_history', ['generated_at'], unique=False)
    op.create_index(op.f('ix_code_generation_history_id'), 'code_generation_history', ['id'], unique=False)
    op.create_index(op.f('ix_code_generation_history_user_id'), 'code_generation_history', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop code_generation_history table
    op.drop_index(op.f('ix_code_generation_history_user_id'), table_name='code_generation_history')
    op.drop_index(op.f('ix_code_generation_history_id'), table_name='code_generation_history')
    op.drop_index(op.f('ix_code_generation_history_generated_at'), table_name='code_generation_history')
    op.drop_index(op.f('ix_code_generation_history_application_id'), table_name='code_generation_history')
    op.drop_table('code_generation_history')
