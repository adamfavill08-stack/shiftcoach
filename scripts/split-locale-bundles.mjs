import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const providerPath = path.join(root, 'components/providers/language-provider.tsx')
const lines = fs.readFileSync(providerPath, 'utf8').split(/\r?\n/)
const slice = (start, end) => lines.slice(start - 1, end).join('\n')
const outDir = path.join(root, 'lib/i18n/locale-bundles')
fs.mkdirSync(outDir, { recursive: true })

const enImports = `import { calendarMessagesEn } from '@/lib/i18n/calendar'
import { mealTimingCoachEn } from '@/lib/i18n/mealTimingCoach'
import { nutritionSettingsEn } from '@/lib/i18n/nutritionSettings'
import { moodFocusMessagesEn } from '@/lib/i18n/moodFocus'
import { dataPrivacySettingsEn } from '@/lib/i18n/dataPrivacySettings'
import { settingsAppearanceEn } from '@/lib/i18n/settingsAppearance'
import { settingsSubscriptionEn } from '@/lib/i18n/settingsSubscription'
import { profileSettingsPageEn } from '@/lib/i18n/profileSettingsPage'
import { settingsSupportUiEn } from '@/lib/i18n/settingsSupportUi'
import { wearablesSetupPageExtraEn } from '@/lib/i18n/wearablesSetupPageExtra'
import { dashboardBannerMessagesEn } from '@/lib/i18n/dashboardBannerMessages'
import { dashboardHomeUiMessagesEn } from '@/lib/i18n/dashboardHomeUiMessages'
import { appShellMessagesEn } from '@/lib/i18n/appShellMessages'
import { activityLogPageEn } from '@/lib/i18n/activityLogPage'
import { stepsPageEn } from '@/lib/i18n/stepsPage'
import { heartHealthUiMessagesEn } from '@/lib/i18n/heartHealthUiMessages'
import { rotaUploadPageEn } from '@/lib/i18n/rotaUploadPage'
import { sleepUiMessagesEn } from '@/lib/i18n/sleepUiMessages'
import { rotaFlowPagesEn } from '@/lib/i18n/rotaFlowPages'
import { accountLegalShellEn } from '@/lib/i18n/accountLegalShellMessages'`

const esImports = `import { calendarMessagesEs } from '@/lib/i18n/calendar'
import { mealTimingCoachEs } from '@/lib/i18n/mealTimingCoach'
import { nutritionSettingsEs } from '@/lib/i18n/nutritionSettings'
import { moodFocusMessagesEs } from '@/lib/i18n/moodFocus'
import { blogArticleOverridesEs } from '@/lib/i18n/blog/articleOverrides'
import { dataPrivacySettingsEs } from '@/lib/i18n/dataPrivacySettings'
import { settingsAppearanceEs } from '@/lib/i18n/settingsAppearance'
import { settingsSubscriptionEs } from '@/lib/i18n/settingsSubscription'
import { profileSettingsPageEs } from '@/lib/i18n/profileSettingsPage'
import { settingsSupportUiEs } from '@/lib/i18n/settingsSupportUi'
import { wearablesSetupPageExtraEs } from '@/lib/i18n/wearablesSetupPageExtra'
import { dashboardBannerMessagesEs } from '@/lib/i18n/dashboardBannerMessages'
import { dashboardHomeUiMessagesEs } from '@/lib/i18n/dashboardHomeUiMessages'
import { appShellMessagesEs } from '@/lib/i18n/appShellMessages'
import { activityLogPageEs } from '@/lib/i18n/activityLogPage'
import { stepsPageEs } from '@/lib/i18n/stepsPage'
import { heartHealthUiMessagesEs } from '@/lib/i18n/heartHealthUiMessages'
import { rotaUploadPageEs } from '@/lib/i18n/rotaUploadPage'
import { sleepUiMessagesEs } from '@/lib/i18n/sleepUiMessages'
import { rotaFlowPagesEs } from '@/lib/i18n/rotaFlowPages'
import { accountLegalShellEs } from '@/lib/i18n/accountLegalShellMessages'`

const deImports = `import { calendarMessagesDe } from '@/lib/i18n/calendar'
import { mealTimingCoachDe } from '@/lib/i18n/mealTimingCoach'
import { nutritionSettingsDe } from '@/lib/i18n/nutritionSettings'
import { moodFocusMessagesDe } from '@/lib/i18n/moodFocus'
import { blogArticleOverridesDe } from '@/lib/i18n/blog/articleOverrides'
import { dataPrivacySettingsDe } from '@/lib/i18n/dataPrivacySettings'
import { settingsAppearanceDe } from '@/lib/i18n/settingsAppearance'
import { settingsSubscriptionDe } from '@/lib/i18n/settingsSubscription'
import { profileSettingsPageDe } from '@/lib/i18n/profileSettingsPage'
import { settingsSupportUiDe } from '@/lib/i18n/settingsSupportUi'
import { wearablesSetupPageExtraDe } from '@/lib/i18n/wearablesSetupPageExtra'
import { dashboardBannerMessagesDe } from '@/lib/i18n/dashboardBannerMessages'
import { dashboardHomeUiMessagesDe } from '@/lib/i18n/dashboardHomeUiMessages'
import { appShellMessagesDe } from '@/lib/i18n/appShellMessages'
import { activityLogPageDe } from '@/lib/i18n/activityLogPage'
import { stepsPageDe } from '@/lib/i18n/stepsPage'
import { heartHealthUiMessagesDe } from '@/lib/i18n/heartHealthUiMessages'
import { rotaUploadPageDe } from '@/lib/i18n/rotaUploadPage'
import { sleepUiMessagesDe } from '@/lib/i18n/sleepUiMessages'
import { rotaFlowPagesDe } from '@/lib/i18n/rotaFlowPages'
import { accountLegalShellDe } from '@/lib/i18n/accountLegalShellMessages'`

const frImports = `import { batch1Fr } from '@/lib/i18n/batches/batch1-fr'
import { calendarMessagesFr } from '@/lib/i18n/calendar'
import { mealTimingCoachFr } from '@/lib/i18n/mealTimingCoach'
import { nutritionSettingsFr } from '@/lib/i18n/nutritionSettings'
import { moodFocusMessagesFr } from '@/lib/i18n/moodFocus'
import { blogArticleOverridesFr } from '@/lib/i18n/blog/articleOverrides'
import { dataPrivacySettingsFr } from '@/lib/i18n/dataPrivacySettings'
import { settingsAppearanceFr } from '@/lib/i18n/settingsAppearance'
import { settingsSubscriptionFr } from '@/lib/i18n/settingsSubscription'
import { profileSettingsPageFr } from '@/lib/i18n/profileSettingsPage'
import { settingsSupportUiFr } from '@/lib/i18n/settingsSupportUi'
import { wearablesSetupPageExtraFr } from '@/lib/i18n/wearablesSetupPageExtra'
import { dashboardBannerMessagesFr } from '@/lib/i18n/dashboardBannerMessages'
import { dashboardHomeUiMessagesFr } from '@/lib/i18n/dashboardHomeUiMessages'
import { appShellMessagesFr } from '@/lib/i18n/appShellMessages'
import { activityLogPageFr } from '@/lib/i18n/activityLogPage'
import { stepsPageFr } from '@/lib/i18n/stepsPage'
import { heartHealthUiMessagesFr } from '@/lib/i18n/heartHealthUiMessages'
import { rotaUploadPageFr } from '@/lib/i18n/rotaUploadPage'
import { sleepUiMessagesFr } from '@/lib/i18n/sleepUiMessages'
import { rotaFlowPagesFr } from '@/lib/i18n/rotaFlowPages'
import { accountLegalShellFr } from '@/lib/i18n/accountLegalShellMessages'`

const ptBRImports = `import { batch1PtBR } from '@/lib/i18n/batches/batch1-pt-br'
import { calendarMessagesPtBR } from '@/lib/i18n/calendar'
import { mealTimingCoachPtBR } from '@/lib/i18n/mealTimingCoach'
import { nutritionSettingsPtBR } from '@/lib/i18n/nutritionSettings'
import { moodFocusMessagesPtBR } from '@/lib/i18n/moodFocus'
import { blogArticleOverridesPtBR } from '@/lib/i18n/blog/articleOverrides'
import { dataPrivacySettingsPtBR } from '@/lib/i18n/dataPrivacySettings'
import { settingsAppearancePtBR } from '@/lib/i18n/settingsAppearance'
import { settingsSubscriptionPtBR } from '@/lib/i18n/settingsSubscription'
import { profileSettingsPagePtBR } from '@/lib/i18n/profileSettingsPage'
import { settingsSupportUiPtBR } from '@/lib/i18n/settingsSupportUi'
import { wearablesSetupPageExtraPtBR } from '@/lib/i18n/wearablesSetupPageExtra'
import { dashboardBannerMessagesPtBR } from '@/lib/i18n/dashboardBannerMessages'
import { dashboardHomeUiMessagesPtBR } from '@/lib/i18n/dashboardHomeUiMessages'
import { appShellMessagesPtBR } from '@/lib/i18n/appShellMessages'
import { activityLogPagePtBR } from '@/lib/i18n/activityLogPage'
import { stepsPagePtBR } from '@/lib/i18n/stepsPage'
import { heartHealthUiMessagesPtBR } from '@/lib/i18n/heartHealthUiMessages'
import { rotaUploadPagePtBR } from '@/lib/i18n/rotaUploadPage'
import { sleepUiMessagesPtBR } from '@/lib/i18n/sleepUiMessages'
import { rotaFlowPagesPtBR } from '@/lib/i18n/rotaFlowPages'
import { accountLegalShellPtBR } from '@/lib/i18n/accountLegalShellMessages'`

const plImports = `import { batch1Pl } from '@/lib/i18n/batches/batch1-pl'
import { calendarMessagesPl } from '@/lib/i18n/calendar'
import { mealTimingCoachPl } from '@/lib/i18n/mealTimingCoach'
import { nutritionSettingsPl } from '@/lib/i18n/nutritionSettings'
import { moodFocusMessagesPl } from '@/lib/i18n/moodFocus'
import { blogArticleOverridesPl } from '@/lib/i18n/blog/articleOverrides'
import { dataPrivacySettingsPl } from '@/lib/i18n/dataPrivacySettings'
import { settingsAppearancePl } from '@/lib/i18n/settingsAppearance'
import { settingsSubscriptionPl } from '@/lib/i18n/settingsSubscription'
import { profileSettingsPagePl } from '@/lib/i18n/profileSettingsPage'
import { settingsSupportUiPl } from '@/lib/i18n/settingsSupportUi'
import { wearablesSetupPageExtraPl } from '@/lib/i18n/wearablesSetupPageExtra'
import { dashboardBannerMessagesPl } from '@/lib/i18n/dashboardBannerMessages'
import { dashboardHomeUiMessagesPl } from '@/lib/i18n/dashboardHomeUiMessages'
import { appShellMessagesPl } from '@/lib/i18n/appShellMessages'
import { activityLogPagePl } from '@/lib/i18n/activityLogPage'
import { stepsPagePl } from '@/lib/i18n/stepsPage'
import { heartHealthUiMessagesPl } from '@/lib/i18n/heartHealthUiMessages'
import { rotaUploadPagePl } from '@/lib/i18n/rotaUploadPage'
import { sleepUiMessagesPl } from '@/lib/i18n/sleepUiMessages'
import { rotaFlowPagesPl } from '@/lib/i18n/rotaFlowPages'
import { accountLegalShellPl } from '@/lib/i18n/accountLegalShellMessages'`

function file(imports, bodyLines, filename) {
  const body = bodyLines.trimEnd()
  const content = `${imports}

const messages: Record<string, string> = {
${body}
}

export default messages
`
  fs.writeFileSync(path.join(outDir, filename), content, 'utf8')
}

// Line numbers from language-provider.tsx (1-based). Exclude each block's closing `  },`
// so the object body parses inside `const messages = { ... }`.
file(enImports, slice(267, 921), 'en.ts')
file(esImports, slice(924, 1579), 'es.ts')
file(deImports, slice(1582, 2237), 'de.ts')
file(frImports, slice(2241, 2270), 'fr.ts')
file(ptBRImports, slice(2273, 2302), 'pt-BR.ts')
file(plImports, slice(2305, 2334), 'pl.ts')

console.log('Wrote locale bundles to', outDir)
