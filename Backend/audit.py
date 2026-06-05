# audit.py — the one place app code writes to the append-only PHI audit trail.
# Routes that touch PHI call write_audit(...) after the operation succeeds, so
# every patient-data read/write leaves a traceable record (actor, action, entity,
# id, ip, time). Keeping this in a single helper means the audit logic lives in
# one spot — not copy-pasted into every route — and the append-only rule is easy
# to guarantee: this module only ever INSERTs, never UPDATEs or DELETEs.

# Literal pins `action` to an exact set of allowed strings (same idea as the
# status Literals in schemas.py): a typo like "application.raed" is a type error,
# not a silently-mislabelled audit row.
from typing import Literal

# Session is just the type of the DB connection the caller hands us (for the hint).
from sqlalchemy.orm import Session

# The AuditLog table we insert into.
import models


# The closed set of audit actions. It grows ONE entry per slice as we wire audit
# into more PHI routes. Adding a value here is the deliberate gate for "this action
# is now audited":
#   - "application.read"  reading ONE application (single record, real entity_id)
#   - "application.list"  pulling the coordinator inbox (BULK read of patient names,
#                         which are PHI, so entity_id is None — no single record)
Action = Literal["application.read", "application.list"]


# Write one audit row and commit it, then return it. This is intentionally
# "fail-closed": it does NOT swallow exceptions. If the INSERT/commit fails, the
# error propagates to the caller, the route returns 5xx, and the PHI it was about
# to serve is never returned — an unauditable PHI access must not succeed.
def write_audit(
    db: Session,
    *,
    actor_id: int | None,
    action: Action,
    entity: str,
    # None for BULK reads (e.g. "application.list") that touch no single record.
    entity_id: int | None,
    ip: str | None,
) -> models.AuditLog:
    entry = models.AuditLog(
        actor_id=actor_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        ip=ip,
    )
    db.add(entry)
    # Commit here so the audit record is durable on its own — we never want the
    # PHI access to be served while its audit row is still only pending.
    db.commit()
    db.refresh(entry)
    return entry
