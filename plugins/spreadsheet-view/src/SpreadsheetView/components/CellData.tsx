import React from 'react'
import { observer } from 'mobx-react'
import { Instance } from 'mobx-state-tree'

// locals
import type SpreadsheetStateModel from '../models/Spreadsheet'

type SpreadsheetModel = Instance<typeof SpreadsheetStateModel>

const CellData = observer(function ({
  cell,
  spreadsheetModel,
  columnNumber,
}: {
  cell: any
  spreadsheetModel: SpreadsheetModel
  columnNumber: number
}) {
  const column = spreadsheetModel.columns[columnNumber]
  return column &&
    'dataType' in column &&
    column.dataType.DataCellReactComponent ? (
    <column.dataType.DataCellReactComponent
      cell={cell}
      dataType={column.dataType}
      columnNumber={columnNumber}
      spreadsheet={spreadsheetModel}
    />
  ) : (
    cell.text
  )
})

export default CellData
