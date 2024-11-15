import { IAnyModelType } from 'mobx-state-tree'
import PluggableElementBase from './PluggableElementBase'
import { AnyConfigurationSchemaType } from '../configuration'
import { AnyReactComponentType } from '../util'

export default class ConnectionType extends PluggableElementBase {
  stateModel: IAnyModelType

  configSchema: AnyConfigurationSchemaType

  description: string

  url: string

  configEditorComponent?: AnyReactComponentType

  constructor(stuff: {
    name: string
    stateModel: IAnyModelType
    configSchema: AnyConfigurationSchemaType
    displayName: string
    description: string
    configEditorComponent?: AnyReactComponentType
    url: string
  }) {
    super(stuff)
    this.stateModel = stuff.stateModel
    this.configSchema = stuff.configSchema
    this.description = stuff.description
    this.url = stuff.url
    this.configEditorComponent = stuff.configEditorComponent
  }
}
