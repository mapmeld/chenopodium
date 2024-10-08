import ServerSideRendererType, {
  RenderArgs as ServerSideRenderArgs,
  RenderArgsDeserialized as ServerSideRenderArgsDeserialized,
  ResultsSerialized as ServerSideResultsSerialized,
  ResultsDeserialized as ServerSideResultsDeserialized,
} from '@jbrowse/core/pluggableElementTypes/renderers/ServerSideRendererType'
import { Region } from '@jbrowse/core/util/types'
import { abortBreakPoint } from '@jbrowse/core/util'
import { renderToAbstractCanvas } from '@jbrowse/core/util/offscreenCanvasUtils'
import { toArray } from 'rxjs/operators'
import { readConfObject } from '@jbrowse/core/configuration'
import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'
import { getAdapter } from '@jbrowse/core/data_adapters/dataAdapterCache'
import { AnyConfigurationModel } from '@jbrowse/core/configuration'
import { colord } from '@jbrowse/core/util/colord'
import { firstValueFrom } from 'rxjs'
import {
  scaleSequential,
  scaleSequentialLog,
} from '@mui/x-charts-vendor/d3-scale'
import interpolateViridis from './viridis'
import { interpolateRgbBasis } from '@mui/x-charts-vendor/d3-interpolate'

interface HicFeature {
  bin1: number
  bin2: number
  counts: number
}

interface HicDataAdapter extends BaseFeatureDataAdapter {
  getResolution: (bp: number) => Promise<number>
}

export interface RenderArgs extends ServerSideRenderArgs {
  regions: Region[]
}

export interface RenderArgsDeserialized
  extends ServerSideRenderArgsDeserialized {
  regions: Region[]
  dataAdapter: HicDataAdapter
  bpPerPx: number
  highResolutionScaling: number
  resolution: number
  adapterConfig: AnyConfigurationModel
}

export interface RenderArgsDeserializedWithFeatures
  extends RenderArgsDeserialized {
  features: HicFeature[]
}

export type ResultsSerialized = ServerSideResultsSerialized

export type ResultsDeserialized = ServerSideResultsDeserialized

export default class HicRenderer extends ServerSideRendererType {
  supportsSVG = true

  async makeImageData(
    ctx: CanvasRenderingContext2D,
    props: RenderArgsDeserializedWithFeatures,
  ) {
    const {
      features,
      config,
      bpPerPx,
      signal,
      resolution,
      sessionId,
      adapterConfig,
      useLogScale,
      colorScheme,
      regions,
    } = props
    const region = regions[0]!
    const { dataAdapter } = await getAdapter(
      this.pluginManager,
      sessionId,
      adapterConfig,
    )
    const res = await (dataAdapter as HicDataAdapter).getResolution(
      bpPerPx / resolution,
    )

    const width = (region.end - region.start) / bpPerPx
    const w = res / (bpPerPx * Math.sqrt(2))
    const baseColor = colord(readConfObject(config, 'baseColor'))
    const offset = Math.floor(region.start / res)
    if (features.length) {
      let maxScore = 0
      let minBin = 0
      let maxBin = 0
      await abortBreakPoint(signal)
      for (const { bin1, bin2, counts } of features) {
        maxScore = Math.max(counts, maxScore)
        minBin = Math.min(Math.min(bin1, bin2), minBin)
        maxBin = Math.max(Math.max(bin1, bin2), maxBin)
      }
      await abortBreakPoint(signal)
      const colorSchemes = {
        juicebox: ['rgba(0,0,0,0)', 'red'],
        fall: interpolateRgbBasis([
          'rgb(255, 255, 255)',
          'rgb(255, 255, 204)',
          'rgb(255, 237, 160)',
          'rgb(254, 217, 118)',
          'rgb(254, 178, 76)',
          'rgb(253, 141, 60)',
          'rgb(252, 78, 42)',
          'rgb(227, 26, 28)',
          'rgb(189, 0, 38)',
          'rgb(128, 0, 38)',
          'rgb(0, 0, 0)',
        ]),
        viridis: interpolateViridis,
      }
      const m = useLogScale ? maxScore : maxScore / 20

      // @ts-expect-error
      const x1 = colorSchemes[colorScheme] || colorSchemes.juicebox
      const scale = useLogScale
        ? scaleSequentialLog(x1).domain([1, m])
        : scaleSequential(x1).domain([0, m])
      ctx.save()

      if (region.reversed === true) {
        ctx.scale(-1, 1)
        ctx.translate(-width, 0)
      }
      ctx.rotate(-Math.PI / 4)
      let start = Date.now()
      for (const { bin1, bin2, counts } of features) {
        ctx.fillStyle = readConfObject(config, 'color', {
          count: counts,
          maxScore,
          baseColor,
          scale,
          useLogScale,
        })
        ctx.fillRect((bin1 - offset) * w, (bin2 - offset) * w, w, w)
        if (+Date.now() - start > 400) {
          await abortBreakPoint(signal)
          start = +Date.now()
        }
      }
      ctx.restore()
    }
    return undefined
  }

  async render(renderProps: RenderArgsDeserialized) {
    const { config, regions, bpPerPx } = renderProps
    const region = regions[0]!
    const width = (region.end - region.start) / bpPerPx
    const height = readConfObject(config, 'maxHeight')
    const features = await this.getFeatures(renderProps)

    const res = await renderToAbstractCanvas(width, height, renderProps, ctx =>
      this.makeImageData(ctx, {
        ...renderProps,
        features,
      }),
    )
    const results = await super.render({
      ...renderProps,
      ...res,
      features,
      region: renderProps.regions[0],
      height,
      width,
    })

    return {
      ...results,
      ...res,
      height,
      width,
    }
  }

  async getFeatures(args: RenderArgsDeserialized) {
    const { regions, sessionId, adapterConfig } = args
    const { dataAdapter } = await getAdapter(
      this.pluginManager,
      sessionId,
      adapterConfig,
    )
    const features = await firstValueFrom(
      (dataAdapter as BaseFeatureDataAdapter)
        .getFeatures(regions[0]!, args)
        .pipe(toArray()),
    )
    // cast to any to avoid return-type conflict, because the
    // types of features returned by our getFeatures are quite
    // different from the base interface

    return features as any
  }
}

export {
  type RenderArgsSerialized,
  type RenderResults,
} from '@jbrowse/core/pluggableElementTypes/renderers/ServerSideRendererType'
