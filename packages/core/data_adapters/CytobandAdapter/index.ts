import { AdapterType } from '../../pluggableElementTypes'
import PluginManager from '../../PluginManager'
import configSchema from './configSchema'

export default function CytobandAdapterF(pluginManager: PluginManager) {
  pluginManager.addAdapterType(
    () =>
      new AdapterType({
        name: 'CytobandAdapter',
        configSchema,
        getAdapterClass: () => import('./CytobandAdapter').then(f => f.default),
      }),
  )
}
