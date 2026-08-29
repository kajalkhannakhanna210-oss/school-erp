"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { EnquiryActionPermissions, EnquiryRow } from "@/lib/enquiries";
import { EnquiryActionsModal } from "../enquiry-actions-modal";

export function DetailHeaderActions({
  enquiry,
  staffList,
  permissions,
}: {
  enquiry: EnquiryRow;
  staffList: { id: string; full_name: string }[];
  permissions: EnquiryActionPermissions;
}) {
  const [activeModal, setActiveModal] = useState<"assign" | "followup" | "status" | "won" | "lost" | null>(null);
  const [showActions, setShowActions] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={showActions}
        aria-controls="enquiry-detail-actions"
        onClick={() => setShowActions((visible) => !visible)}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ink-900 px-3 text-xs font-semibold text-white sm:hidden"
      >
        <span aria-hidden="true">☷</span>
        {showActions ? "Hide Actions" : "Actions"}
      </button>
      <div id="enquiry-detail-actions" className={`${showActions ? "grid" : "hidden"} w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end`}>
        {permissions.edit && (
          <Link
            href={`/enquiries/${enquiry.id}/edit`}
            className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-lg border border-ink-200 bg-white px-2.5 text-[11px] font-semibold text-ink-700 shadow-sm transition hover:bg-ink-50 sm:w-auto sm:px-3 sm:text-xs"
          >
            ✏ Edit Details
          </Link>
        )}
        {permissions.followup && <Button className="h-9 w-full whitespace-nowrap bg-ink-700 px-2.5 text-[11px] text-white hover:bg-ink-600 sm:w-auto sm:px-3 sm:text-xs" onClick={() => setActiveModal("followup")}>
          Add Follow-up
        </Button>}
        {permissions.assign && <Button variant="outline" className="h-9 w-full whitespace-nowrap border-ink-200 px-2.5 text-[11px] sm:w-auto sm:px-3 sm:text-xs" onClick={() => setActiveModal("assign")}>
          Assign Staff
        </Button>}
        {permissions.change_status && <Button variant="outline" className="h-9 w-full whitespace-nowrap border-ink-200 px-2.5 text-[11px] sm:w-auto sm:px-3 sm:text-xs" onClick={() => setActiveModal("status")}>
          Update Status
        </Button>}
        {permissions.convert_won && enquiry.status !== "Won" && <Button className="h-9 w-full whitespace-nowrap bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700 sm:w-auto sm:px-3 sm:text-xs" onClick={() => setActiveModal("won")}>
          Mark as Won
        </Button>}
        {permissions.mark_lost && enquiry.status !== "Lost" && enquiry.status !== "Closed" && <Button variant="ghost" className="col-span-2 h-9 w-full whitespace-nowrap px-2.5 text-[11px] text-rose-600 hover:bg-rose-50 sm:col-span-1 sm:w-auto sm:px-3 sm:text-xs" onClick={() => setActiveModal("lost")}>
          Mark as Lost
        </Button>}
      </div>
      {activeModal && <EnquiryActionsModal enquiry={enquiry} staffList={staffList} actionType={activeModal} onClose={() => setActiveModal(null)} />}
    </>
  );
}
