"""add_notification_tables

Revision ID: f12345678901
Revises: c902f7692617
Create Date: 2026-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = 'f12345678901'
down_revision = 'c902f7692617'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create in-app notifications table
    op.create_table('in_app_notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('notification_type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('read', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_in_app_notifications_user_id'), 'in_app_notifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_in_app_notifications_created_at'), 'in_app_notifications', ['created_at'], unique=False)
    op.create_index(op.f('ix_in_app_notifications_read'), 'in_app_notifications', ['read'], unique=False)

    # Create user notification preferences table
    op.create_table('user_notification_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email_security_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('email_2fa_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('email_account_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('in_app_security_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('in_app_2fa_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('in_app_account_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('push_security_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('push_2fa_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('push_account_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_notification_preferences_user_id'), 'user_notification_preferences', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_notification_preferences_user_id'), table_name='user_notification_preferences')
    op.drop_table('user_notification_preferences')
    op.drop_index(op.f('ix_in_app_notifications_read'), table_name='in_app_notifications')
    op.drop_index(op.f('ix_in_app_notifications_created_at'), table_name='in_app_notifications')
    op.drop_index(op.f('ix_in_app_notifications_user_id'), table_name='in_app_notifications')
    op.drop_table('in_app_notifications')
