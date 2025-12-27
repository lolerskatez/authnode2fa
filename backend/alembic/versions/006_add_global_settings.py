"""Add GlobalSettings table for login page theme

Revision ID: 006_add_global_settings
Revises: 005_add_settings_column
Create Date: 2025-12-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_global_settings'
down_revision = '005_add_settings_column'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'global_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('login_page_theme', sa.String(), nullable=True, server_default='light'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('global_settings')
