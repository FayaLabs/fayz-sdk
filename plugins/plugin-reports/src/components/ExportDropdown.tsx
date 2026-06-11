import React, { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@fayz/ui'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import type { ReportColumnDef } from '../types'
import { exportToCsv } from '../export/csv'

interface ExportDropdownProps {
  columns: ReportColumnDef[]
  data: Record<string, any>[]
  filename: string
  currency?: string
  title?: string
}

export function ExportDropdown({ columns, data, filename, currency, title }: ExportDropdownProps) {
  const t = useTranslation()
  const [excelAvailable, setExcelAvailable] = useState(false)
  const [pdfAvailable, setPdfAvailable] = useState(false)

  useEffect(() => {
    import('../export/excel').then((m) => m.isExcelAvailable()).then(setExcelAvailable).catch(() => {})
    import('../export/pdf').then((m) => m.isPdfAvailable()).then(setPdfAvailable).catch(() => {})
  }, [])

  const handleCsv = () => exportToCsv(columns, data, filename, currency)

  const handleExcel = async () => {
    const { exportToExcel } = await import('../export/excel')
    await exportToExcel(columns, data, filename, currency)
  }

  const handlePdf = async () => {
    const { exportToPdf } = await import('../export/pdf')
    await exportToPdf(columns, data, filename, { title, currency })
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1.5" />
          {t('reports.export')}
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end">
        <DropdownItem onClick={handleCsv}>{t('reports.exportCsv')}</DropdownItem>
        {excelAvailable && (
          <DropdownItem onClick={handleExcel}>{t('reports.exportExcel')}</DropdownItem>
        )}
        {pdfAvailable && (
          <DropdownItem onClick={handlePdf}>{t('reports.exportPdf')}</DropdownItem>
        )}
      </DropdownContent>
    </Dropdown>
  )
}
