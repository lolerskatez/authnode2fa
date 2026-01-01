"""add_account_sharing_tables

Revision ID: g23456789012
Revises: f12345678901
Create Date: 2026-01-01 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = 'g23456789012'
down_revision = 'f12345678901'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create account sharing table
    op.create_table('account_shares',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('shared_with_id', sa.Integer(), nullable=False),
        sa.Column('permission_level', sa.String(), nullable=False, default='view'),  # view, use, manage
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_with_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_account_shares_application_id'), 'account_shares', ['application_id'], unique=False)
    op.create_index(op.f('ix_account_shares_owner_id'), 'account_shares', ['owner_id'], unique=False)
    op.create_index(op.f('ix_account_shares_shared_with_id'), 'account_shares', ['shared_with_id'], unique=False)
    op.create_index(op.f('ix_account_shares_is_active'), 'account_shares', ['is_active'], unique=False)

    # Create share invitations table for pending shares
    op.create_table('share_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('invited_email', sa.String(), nullable=False),
        sa.Column('permission_level', sa.String(), nullable=False, default='view'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('invitation_token', sa.String(), nullable=False, unique=True),
        sa.Column('status', sa.String(), nullable=False, default='pending'),  # pending, accepted, declined, expired
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_share_invitations_invitation_token'), 'share_invitations', ['invitation_token'], unique=True)
    op.create_index(op.f('ix_share_invitations_invited_email'), 'share_invitations', ['invited_email'], unique=False)
    op.create_index(op.f('ix_share_invitations_status'), 'share_invitations', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_share_invitations_status'), table_name='share_invitations')
    op.drop_index(op.f('ix_share_invitations_invited_email'), table_name='share_invitations')
    op.drop_index(op.f('ix_share_invitations_invitation_token'), table_name='share_invitations')
    op.drop_table('share_invitations')
    op.drop_index(op.f('ix_account_shares_is_active'), table_name='account_shares')
    op.drop_index(op.f('ix_account_shares_shared_with_id'), table_name='account_shares')
    op.drop_index(op.f('ix_account_shares_owner_id'), table_name='account_shares')
    op.drop_index(op.f('ix_account_shares_application_id'), table_name='account_shares')
    op.drop_table('account_shares')
