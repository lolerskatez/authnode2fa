"""add_custom_icons_and_themes

Revision ID: h34567890123
Revises: g23456789012
Create Date: 2026-01-01 12:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h34567890123'
down_revision = 'g23456789012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add custom themes table
    op.create_table('custom_themes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('colors', sa.JSON(), nullable=False),  # Theme color definitions
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_custom_themes_user_id'), 'custom_themes', ['user_id'], unique=False)

    # Add custom icons table
    op.create_table('custom_icons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_custom_icons_user_id'), 'custom_icons', ['user_id'], unique=False)
    op.create_index(op.f('ix_custom_icons_filename'), 'custom_icons', ['filename'], unique=False)

    # Add theme_id column to users table for selected theme
    op.add_column('users', sa.Column('selected_theme_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_selected_theme_id', 'users', 'custom_themes', ['selected_theme_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_users_selected_theme_id', 'users', type_='foreignkey')
    op.drop_column('users', 'selected_theme_id')
    op.drop_index(op.f('ix_custom_icons_filename'), table_name='custom_icons')
    op.drop_index(op.f('ix_custom_icons_user_id'), table_name='custom_icons')
    op.drop_table('custom_icons')
    op.drop_index(op.f('ix_custom_themes_user_id'), table_name='custom_themes')
    op.drop_table('custom_themes')
