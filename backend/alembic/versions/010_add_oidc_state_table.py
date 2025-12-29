"""Add OIDCState table for OAuth2 state management

Revision ID: 010_add_oidc_state_table
Revises: 5cf678704ab4
Create Date: 2024-12-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010_add_oidc_state_table'
down_revision = '5cf678704ab4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the oidc_states table
    op.create_table(
        'oidc_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('state_hash', sa.String(), nullable=False),
        sa.Column('nonce', sa.String(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # Create indices
    op.create_index(op.f('ix_oidc_states_state_hash'), 'oidc_states', ['state_hash'], unique=True)
    op.create_index(op.f('ix_oidc_states_expires_at'), 'oidc_states', ['expires_at'])
    op.create_index(op.f('ix_oidc_states_created_at'), 'oidc_states', ['created_at'])


def downgrade() -> None:
    # Drop indices
    op.drop_index(op.f('ix_oidc_states_created_at'), table_name='oidc_states')
    op.drop_index(op.f('ix_oidc_states_expires_at'), table_name='oidc_states')
    op.drop_index(op.f('ix_oidc_states_state_hash'), table_name='oidc_states')
    # Drop the table
    op.drop_table('oidc_states')
