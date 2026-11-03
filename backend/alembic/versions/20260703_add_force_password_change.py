"""add force_password_change to users

Revision ID: 20260703_add_force_password_change
Revises: 
Create Date: 2026-07-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260703_add_force_password_change"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add a non-nullable boolean column with a safe default for existing rows.
    # Be defensive: some environments (SQLite) may have partially applied this
    # migration earlier; check for column existence first to avoid errors.
    conn = op.get_bind()
    res = conn.execute(sa.text("PRAGMA table_info('users')")).fetchall()
    existing_cols = [row[1] for row in res]
    if "force_password_change" not in existing_cols:
        op.add_column(
            "users",
            sa.Column(
                "force_password_change",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )


def downgrade() -> None:
    op.drop_column("users", "force_password_change")
