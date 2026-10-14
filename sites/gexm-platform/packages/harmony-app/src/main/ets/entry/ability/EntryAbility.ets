/**
 * EntryAbility - 应用入口能力
 * 
 * 注意：此文件为 ArkTS 代码示例，需将其内容复制到 DevEco Studio 生成的 Stage 工程中使用
 * 
 * 功能：
 * 1. 应用生命周期管理
 * 2. 全局状态初始化
 * 3. 路由导航配置
 * 4. 权限请求处理
 */

import { UIAbility, AbilityConstant, Want } from '@kit.AbilityKit'
import { hilog } from '@kit.CoreKit'
import { window } from '@kit.ArkUI'
import { Preferences } from '@kit.DataKit'
import { BusinessError } from '@kit.BasicServicesKit'

const TAG = 'EntryAbility'

export default class EntryAbility extends UIAbility {
  private preferences: Preferences | null = null

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam) {
    hilog.info(0x0000, TAG, '%{public}s', 'EntryAbility onCreate')
    
    this.initPreferences()
    this.initGlobalState()
  }

  onDestroy() {
    hilog.info(0x0000, TAG, '%{public}s', 'EntryAbility onDestroy')
  }

  onForeground() {
    hilog.info(0x0000, TAG, '%{public}s', 'EntryAbility onForeground')
  }

  onBackground() {
    hilog.info(0x0000, TAG, '%{public}s', 'EntryAbility onBackground')
  }

  onWindowStageCreate(windowStage: window.WindowStage) {
    hilog.info(0x0000, TAG, '%{public}s', 'EntryAbility onWindowStageCreate')

    windowStage.loadContent('pages/index/index', (err) => {
      if (err.code) {
        hilog.error(0x0000, TAG, 'Failed to load the content. Cause: %{public}s', JSON.stringify(err))
        return
      }
      hilog.info(0x0000, TAG, 'Succeeded in loading the content.')
    })
  }

  onWindowStageDestroy() {
    hilog.info(0x0000, TAG, '%{public}s', 'EntryAbility onWindowStageDestroy')
  }

  private async initPreferences() {
    try {
      this.preferences = await Preferences.getPreferences(getContext(this), 'gexm_app')
      hilog.info(0x0000, TAG, 'Preferences initialized successfully')
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to initialize preferences: %{public}s', (error as BusinessError).message)
    }
  }

  private initGlobalState() {
    const context = getContext(this)
    hilog.info(0x0000, TAG, 'Global state initialized')
  }
}