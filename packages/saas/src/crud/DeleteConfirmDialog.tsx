import React from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@fayz/ui'
import { Button } from '@fayz/ui'
import { useTranslation } from '@fayz/core'

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  entityName: string
  displayValue?: string
}

export function DeleteConfirmDialog({ open, onClose, onConfirm, entityName, displayValue }: DeleteConfirmDialogProps) {
  const t = useTranslation()
  return (
    <Modal open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t('crud.delete.title', { entity: entityName })}</ModalTitle>
          <ModalDescription>
            {displayValue
              ? t('crud.delete.confirmNamed', { name: displayValue })
              : t('crud.delete.confirmGeneric', { entity: entityName.toLowerCase() })}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="destructive" onClick={onConfirm}>{t('common.delete')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
