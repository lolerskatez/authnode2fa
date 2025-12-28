"""Add SSO support with OIDC configuration

Revision ID: 007_add_sso_support
Revises: 006_add_global_settings
Create Date: 2025-12-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_add_sso_support'
down_revision = '006_add_global_settings'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_sso_user column to users table
    op.add_column('users', sa.Column('is_sso_user', sa.Boolean(), nullable=False, server_default='0'))

    # Make password_hash nullable for SSO users
    # Note: SQLite doesn't support ALTER COLUMN directly, this is handled at the application level
    # For PostgreSQL and other databases, uncomment:
    # op.alter_column('users', 'password_hash', existing_type=sa.String(), nullable=True)

    # Create oidc_config table
    op.create_table('oidc_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('provider_name', sa.String(), nullable=False, default='Custom OIDC Provider'),
        sa.Column('client_id', sa.String(), nullable=True),
        sa.Column('client_secret', sa.String(), nullable=True),
        sa.Column('issuer_url', sa.String(), nullable=True),
        sa.Column('authorization_endpoint', sa.String(), nullable=True),
        sa.Column('token_endpoint', sa.String(), nullable=True),
        sa.Column('userinfo_endpoint', sa.String(), nullable=True),
        sa.Column('jwks_uri', sa.String(), nullable=True),
        sa.Column('logout_endpoint', sa.String(), nullable=True),
        sa.Column('redirect_uri', sa.String(), nullable=True),
        sa.Column('scope', sa.String(), nullable=False, default='openid email profile'),
        sa.Column('admin_groups', sa.JSON(), nullable=False, default='["administrators", "admins"]'),
        sa.Column('user_groups', sa.JSON(), nullable=False, default='["users"]'),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # Drop oidc_config table
    op.drop_table('oidc_config')

    # Remove is_sso_user column
    op.drop_column('users', 'is_sso_user')

    # Make password_hash non-nullable again
    # Note: SQLite doesn't support ALTER COLUMN directly, this is handled at the application level
    # For PostgreSQL and other databases, uncomment:
    # op.alter_column('users', 'password_hash', existing_type=sa.String(), nullable=False)