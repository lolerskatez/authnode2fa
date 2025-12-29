"""Add WebAuthn credential and challenge tables

Revision ID: add_webauthn_support
Revises: 010_add_password_reset_sessions_audit
Create Date: 2025-12-29 12:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_webauthn_support'
down_revision = '010_add_password_reset_sessions_audit'
branch_labels = None
depends_on = None


def upgrade():
    # Create webauthn_credentials table
    op.create_table(
        'webauthn_credentials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('credential_id', sa.String(), nullable=False),
        sa.Column('public_key', sa.Text(), nullable=False),
        sa.Column('sign_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('device_name', sa.String(), nullable=True),
        sa.Column('device_type', sa.String(), nullable=True),
        sa.Column('transports', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('credential_id')
    )
    op.create_index('ix_webauthn_credentials_user_id', 'webauthn_credentials', ['user_id'])

    # Create webauthn_challenges table
    op.create_table(
        'webauthn_challenges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('challenge', sa.String(), nullable=False),
        sa.Column('challenge_type', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('challenge')
    )
    op.create_index('ix_webauthn_challenges_user_id', 'webauthn_challenges', ['user_id'])
    op.create_index('ix_webauthn_challenges_expires_at', 'webauthn_challenges', ['expires_at'])


def downgrade():
    # Drop webauthn_challenges table
    op.drop_index('ix_webauthn_challenges_expires_at', 'webauthn_challenges')
    op.drop_index('ix_webauthn_challenges_user_id', 'webauthn_challenges')
    op.drop_table('webauthn_challenges')

    # Drop webauthn_credentials table
    op.drop_index('ix_webauthn_credentials_user_id', 'webauthn_credentials')
    op.drop_table('webauthn_credentials')
