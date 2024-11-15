import React, { useRef } from 'react'
import { makeStyles } from 'tss-react/mui'
import { observer } from 'mobx-react'
import { Menu } from '@jbrowse/core/ui'
import { getEnv } from '@jbrowse/core/util'

// local utils
import { LinearGenomeViewModel } from '..'

// local components
import Rubberband from './Rubberband'
import Scalebar from './Scalebar'
import Gridlines from './Gridlines'
import CenterLine from './CenterLine'
import VerticalGuide from './VerticalGuide'
import RubberbandSpan from './RubberbandSpan'
import HighlightGroup from './Highlight'
import { SCALE_BAR_HEIGHT } from '../consts'

// hooks
import { useSideScroll } from './useSideScroll'
import { useWheelScroll } from './useWheelScroll'
import { useRangeSelect } from './useRangeSelect'

const useStyles = makeStyles()({
  tracksContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
})

type LGV = LinearGenomeViewModel

const TracksContainer = observer(function TracksContainer({
  children,
  model,
}: {
  children: React.ReactNode
  model: LGV
}) {
  const { classes } = useStyles()
  const { pluginManager } = getEnv(model)
  const { mouseDown: mouseDown1, mouseUp } = useSideScroll(model)
  const { showGridlines, showCenterLine } = model
  const ref = useRef<HTMLDivElement>(null)
  const {
    guideX,
    rubberbandOn,
    leftBpOffset,
    rightBpOffset,
    numOfBpSelected,
    width,
    left,
    anchorPosition,
    open,
    handleMenuItemClick,
    handleClose,
    mouseMove,
    mouseDown: mouseDown2,
  } = useRangeSelect(ref, model, true)
  useWheelScroll(ref, model)

  const additional = pluginManager.evaluateExtensionPoint(
    'LinearGenomeView-TracksContainerComponent',
    undefined,
    { model },
  ) as React.ReactNode

  return (
    <div
      ref={ref}
      data-testid="trackContainer"
      className={classes.tracksContainer}
      onMouseDown={event => {
        mouseDown1(event)
        mouseDown2(event)
      }}
      onMouseMove={mouseMove}
      onMouseUp={mouseUp}
    >
      {showGridlines ? <Gridlines model={model} /> : null}
      {showCenterLine ? <CenterLine model={model} /> : null}
      {guideX !== undefined ? (
        <VerticalGuide model={model} coordX={guideX} />
      ) : rubberbandOn ? (
        <RubberbandSpan
          leftBpOffset={leftBpOffset}
          rightBpOffset={rightBpOffset}
          numOfBpSelected={numOfBpSelected}
          width={width}
          left={left}
        />
      ) : null}
      {anchorPosition ? (
        <Menu
          anchorReference="anchorPosition"
          anchorPosition={{
            left: anchorPosition.clientX,
            top: anchorPosition.clientY,
          }}
          onMenuItemClick={handleMenuItemClick}
          open={open}
          onClose={handleClose}
          menuItems={model.rubberBandMenuItems()}
        />
      ) : null}

      <Rubberband
        model={model}
        ControlComponent={
          <Scalebar
            model={model}
            style={{
              height: SCALE_BAR_HEIGHT,
              boxSizing: 'border-box',
            }}
          />
        }
      />
      <HighlightGroup model={model} />
      {additional}
      {children}
    </div>
  )
})

export default TracksContainer
