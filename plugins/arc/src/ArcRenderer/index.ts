import PluginManager from '@jbrowse/core/PluginManager'

import ReactComponent from './ArcRendering'
import configSchema from './configSchema'
import ArcRenderer from './ArcRenderer'

export default function ArcRendererF(pluginManager: PluginManager) {
  pluginManager.addRendererType(
    () =>
      new ArcRenderer({
        name: 'ArcRenderer',
        ReactComponent,
        configSchema,
        pluginManager,
      }),
  )
}
