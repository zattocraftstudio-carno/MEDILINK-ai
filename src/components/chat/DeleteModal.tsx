import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Conversation?">
      <p className="text-[15px] text-text-muted mb-6">
        This will permanently remove this chat from your history.
      </p>
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="emergency" onClick={() => { onConfirm(); onClose(); }}>Delete</Button>
      </div>
    </Modal>
  );
};
