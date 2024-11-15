import {
  BaseFeatureDataAdapter,
  BaseOptions,
} from '@jbrowse/core/data_adapters/BaseAdapter'
import { NoAssemblyRegion } from '@jbrowse/core/util/types'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'
import SimpleFeature, { Feature } from '@jbrowse/core/util/simpleFeature'
import format from 'string-template'
import { Instance } from 'mobx-state-tree'
import { readConfObject } from '@jbrowse/core/configuration'
import PluginManager from '@jbrowse/core/PluginManager'
import { getSubAdapterType } from '@jbrowse/core/data_adapters/dataAdapterCache'

import type MyConfigSchema from './configSchema'

interface SPARQLEntry {
  type: string
  value: string
  dataTypes?: string
}

type SPARQLBinding = Record<string, SPARQLEntry>

interface SPARQLResponseHead {
  vars: string[]
}

interface SPARQLResponseResults {
  bindings?: SPARQLBinding[]
}

interface SPARQLResponse {
  head: SPARQLResponseHead
  results: SPARQLResponseResults
}

interface SPARQLFeatureData {
  start: number
  end: number
  strand: number
  refName: string
  subfeatures?: SPARQLFeatureData[]
  uniqueId: string

  [propName: string]: any
}

interface SPARQLFeature {
  data: SPARQLFeatureData
}

export default class SPARQLAdapter extends BaseFeatureDataAdapter {
  private endpoint: string

  private queryTemplate: string

  private refNamesQueryTemplate: string

  private additionalQueryParams: string[]

  private configRefNames: string[]

  private refNames: string[] | undefined

  public constructor(
    config: Instance<typeof MyConfigSchema>,
    getSubAdapter?: getSubAdapterType,
    pluginManager?: PluginManager,
  ) {
    super(config, getSubAdapter, pluginManager)
    this.endpoint = readConfObject(config, 'endpoint').uri
    this.queryTemplate = readConfObject(config, 'queryTemplate')
    this.additionalQueryParams = readConfObject(config, 'additionalQueryParams')
    this.refNamesQueryTemplate = readConfObject(config, 'refNamesQueryTemplate')
    this.configRefNames = readConfObject(config, 'refNames')
  }

  public async getRefNames(opts: BaseOptions = {}): Promise<string[]> {
    if (this.refNames) {
      return this.refNames
    }
    if (this.refNamesQueryTemplate) {
      const queryTemplate = encodeURIComponent(this.refNamesQueryTemplate)
      const results = await this.querySparql(queryTemplate, opts)
      this.refNames = this.resultsToRefNames(results)
    } else {
      this.refNames = this.configRefNames
    }
    return this.refNames
  }

  public getFeatures(query: NoAssemblyRegion, opts: BaseOptions = {}) {
    return ObservableCreate<Feature>(async observer => {
      const filledTemplate = encodeURIComponent(
        format(this.queryTemplate, query),
      )
      const { refName } = query
      const results = await this.querySparql(filledTemplate, opts)
      this.resultsToFeatures(results, refName).forEach(feature => {
        observer.next(feature)
      })
      observer.complete()
    }, opts.signal)
  }

  private async querySparql(query: string, opts?: BaseOptions): Promise<any> {
    let additionalQueryParams = ''
    if (this.additionalQueryParams.length) {
      additionalQueryParams = `&${this.additionalQueryParams.join('&')}`
    }
    const signal = opts?.signal
    const response = await fetch(
      `${this.endpoint}?query=${query}${additionalQueryParams}`,
      {
        headers: { accept: 'application/json,application/sparql-results+json' },
        signal,
      },
    )
    return response.json()
  }

  private resultsToRefNames(response: SPARQLResponse): string[] {
    const rows = response.results.bindings || []
    const fields = response.head.vars
    if (!fields.includes('refName')) {
      throw new Error('"refName" not found in refNamesQueryTemplate response')
    }
    return rows.map(row => row.refName!.value)
  }

  private resultsToFeatures(
    results: SPARQLResponse,
    refName: string,
  ): SimpleFeature[] {
    const rows = results.results.bindings || []
    const fields = results.head.vars
    const requiredFields = ['start', 'end', 'uniqueId']
    requiredFields.forEach(requiredField => {
      if (!fields.includes(requiredField)) {
        console.error(
          `Required field ${requiredField} missing from feature data`,
        )
      }
    })
    const seenFeatures: Record<string, SPARQLFeature> = {}
    rows.forEach(row => {
      const rawData: Record<string, string>[] = [{}]
      fields.forEach(field => {
        if (field in row) {
          const { value } = row[field]!
          let idx = 0
          while (field.startsWith('sub_')) {
            field = field.slice(4)
            idx += 1
          }
          while (idx > rawData.length - 1) {
            rawData.push({})
          }
          rawData[idx]![field] = value
        }
      })

      rawData.forEach((rd, idx) => {
        const { uniqueId, start, end, strand } = rd
        if (idx < rawData.length - 1) {
          rawData[idx + 1]!.parentUniqueId = uniqueId!
        }
        seenFeatures[uniqueId!] = {
          data: {
            ...rd,
            uniqueId: uniqueId!,
            refName,
            start: Number.parseInt(start!, 10),
            end: Number.parseInt(end!, 10),
            strand: Number.parseInt(strand!, 10) || 0,
          },
        }
      })
    })

    // resolve subfeatures, keeping only top-level features in seenFeatures
    for (const [uniqueId, f] of Object.entries(seenFeatures)) {
      const pid = f.data.parentUniqueId
      f.data.parentUniqueId = undefined
      if (pid) {
        const p = seenFeatures[pid]
        if (p) {
          if (!p.data.subfeatures) {
            p.data.subfeatures = []
          }
          p.data.subfeatures.push({
            ...f.data,
            uniqueId,
          })
          delete seenFeatures[uniqueId]
        } else {
          const subfeatures = Object.values(seenFeatures)
            .map(sf => sf.data.subfeatures)
            .filter(sf => !!sf)
            .flat()
          let found = false
          for (const subfeature of subfeatures) {
            if (subfeature.uniqueId === pid) {
              if (!subfeature.subfeatures) {
                subfeature.subfeatures = []
              }
              subfeature.subfeatures.push({
                ...f.data,
                uniqueId,
              })
              delete seenFeatures[uniqueId]
              found = true
              break
            }
            if (subfeature.subfeatures) {
              subfeatures.push(...subfeature.subfeatures)
            }
          }
          if (!found) {
            console.error(`Could not find parentID ${pid}`)
          }
        }
      }
    }

    return Object.keys(seenFeatures).map(
      seenFeature =>
        new SimpleFeature({
          ...seenFeatures[seenFeature]!.data,
          uniqueId: seenFeature,
          subfeatures: seenFeatures[seenFeature]!.data.subfeatures,
        }),
    )
  }

  public async hasDataForRefName(
    refName: string,
    opts: BaseOptions = {},
  ): Promise<boolean> {
    const refNames = await this.getRefNames(opts)
    if (refNames.length && !refNames.includes(refName)) {
      return false
    }
    return true
  }

  public freeResources(/* { region } */): void {}
}
