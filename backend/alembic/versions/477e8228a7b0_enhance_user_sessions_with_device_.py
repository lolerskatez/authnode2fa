"""enhance_user_sessions_with_device_fingerprinting

Revision ID: 477e8228a7b0
Revises: 6f9e35c917f2
Create Date: 2025-12-30 00:30:20.267459

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '477e8228a7b0'
down_revision = '6f9e35c917f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add device identification fields
    op.add_column('user_sessions', sa.Column('device_type', sa.String(), nullable=True))
    op.add_column('user_sessions', sa.Column('browser_name', sa.String(), nullable=True))
    op.add_column('user_sessions', sa.Column('browser_version', sa.String(), nullable=True))
    op.add_column('user_sessions', sa.Column('os_name', sa.String(), nullable=True))
    op.add_column('user_sessions', sa.Column('os_version', sa.String(), nullable=True))

    # Add location and network fields
    op.add_column('user_sessions', sa.Column('country_code', sa.String(), nullable=True))
    op.add_column('user_sessions', sa.Column('city', sa.String(), nullable=True))

    # Add device fingerprinting fields
    op.add_column('user_sessions', sa.Column('screen_resolution', sa.String(), nullable=True))
    op.add_column('user_sessions', sa.Column('timezone', sa.String(), nullable=True))
    op.add_column('user_sessions', sa.Column('language', sa.String(), nullable=True))

    # Add session metadata fields
    op.add_column('user_sessions', sa.Column('revoked_reason', sa.String(), nullable=True))

    # Add security flags
    op.add_column('user_sessions', sa.Column('is_current_session', sa.Boolean(), nullable=True, default=False))
    op.add_column('user_sessions', sa.Column('suspicious_activity', sa.Boolean(), nullable=True, default=False))


def downgrade() -> None:
    # Remove security flags
    op.drop_column('user_sessions', 'suspicious_activity')
    op.drop_column('user_sessions', 'is_current_session')

    # Remove session metadata fields
    op.drop_column('user_sessions', 'revoked_reason')

    # Remove device fingerprinting fields
    op.drop_column('user_sessions', 'language')
    op.drop_column('user_sessions', 'timezone')
    op.drop_column('user_sessions', 'screen_resolution')

    # Remove location and network fields
    op.drop_column('user_sessions', 'city')
    op.drop_column('user_sessions', 'country_code')

    # Remove device identification fields
    op.drop_column('user_sessions', 'os_version')
    op.drop_column('user_sessions', 'os_name')
    op.drop_column('user_sessions', 'browser_version')
    op.drop_column('user_sessions', 'browser_name')
    op.drop_column('user_sessions', 'device_type')
