import React from 'react'
import { Typography } from '@mui/material'
import { makeStyles } from 'tss-react/mui'
import { observer } from 'mobx-react'

// core
import { Base1DViewModel } from '@jbrowse/core/util/Base1DViewModel'
import { getSession, getTickDisplayStr } from '@jbrowse/core/util'
import { ContentBlock } from '@jbrowse/core/util/blockTypes'

// locals
import type { LinearGenomeViewModel } from '..'
import { chooseGridPitch } from '../util'
import { HEADER_OVERVIEW_HEIGHT } from '../consts'

const useStyles = makeStyles()({
  scalebarLabel: {
    height: HEADER_OVERVIEW_HEIGHT,
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
})

const OverviewScalebarTickLabels = observer(function ({
  block,
  scale,
  overview,
  model,
}: {
  model: LinearGenomeViewModel
  scale: number
  block: ContentBlock
  overview: Base1DViewModel
}) {
  const { classes } = useStyles()
  const { start, end, reversed, refName, assemblyName } = block
  const { majorPitch } = chooseGridPitch(scale, 120, 15)
  const { assemblyManager } = getSession(model)
  const assembly = assemblyManager.get(assemblyName)
  const refNameColor = assembly?.getRefNameColor(refName)

  const tickLabels = []
  for (let i = 0; i < Math.floor((end - start) / majorPitch); i++) {
    const offsetLabel = (i + 1) * majorPitch
    tickLabels.push(reversed ? end - offsetLabel : start + offsetLabel)
  }
  return tickLabels.map((tickLabel, labelIdx) => (
    <Typography
      key={`${JSON.stringify(block)}-${tickLabel}-${labelIdx}`}
      className={classes.scalebarLabel}
      variant="body2"
      style={{
        left: ((labelIdx + 1) * majorPitch) / scale,
        pointerEvents: 'none',
        color: refNameColor,
      }}
    >
      {getTickDisplayStr(tickLabel, overview.bpPerPx)}
    </Typography>
  ))
})

export default OverviewScalebarTickLabels
