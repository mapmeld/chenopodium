import React from 'react'
// locals
import { toLocale, SimpleFeatureSerialized } from '../../util'
import { BaseProps } from '../types'
import SimpleField from './SimpleField'
import Position from './Position'

export default function CoreDetails(props: BaseProps) {
  const { feature } = props
  const obj = feature as SimpleFeatureSerialized & {
    start: number
    end: number
    assemblyName?: string
    strand: number
    refName: string
    __jbrowsefmt: {
      start?: number
      assemblyName?: string
      end?: number
      refName?: string
      name?: string
    }
  }

  const formattedFeat = { ...obj, ...obj.__jbrowsefmt }
  const { start, end } = formattedFeat

  const displayedDetails: Record<string, any> = {
    ...formattedFeat,
    length: toLocale(end - start),
  }

  const coreRenderedDetails = {
    description: 'Description',
    name: 'Name',
    length: 'Length',
    type: 'Type',
  }
  return (
    <>
      <SimpleField
        name="Position"
        value={<Position {...props} feature={formattedFeat} />}
      />
      {Object.entries(coreRenderedDetails)
        .map(([key, name]) => [name, displayedDetails[key]])
        .filter(([, value]) => value != null)
        .map(([name, value]) => (
          <SimpleField key={name} name={name} value={value} />
        ))}
    </>
  )
}
