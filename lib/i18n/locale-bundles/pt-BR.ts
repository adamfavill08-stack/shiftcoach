import { batch1PtBR } from '@/lib/i18n/batches/batch1-pt-br'
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
import { accountLegalShellPtBR } from '@/lib/i18n/accountLegalShellMessages'
import { guidedHintsTourEn } from '@/lib/i18n/guidedHintsTour'

const messages: Record<string, string> = {
    ...batch1PtBR,
    ...calendarMessagesPtBR,
    ...mealTimingCoachPtBR,
    ...nutritionSettingsPtBR,
    ...moodFocusMessagesPtBR,
    ...blogArticleOverridesPtBR,
    ...dataPrivacySettingsPtBR,
    ...settingsAppearancePtBR,
    ...settingsSubscriptionPtBR,
    ...profileSettingsPagePtBR,
    ...settingsSupportUiPtBR,
    ...wearablesSetupPageExtraPtBR,
    ...dashboardBannerMessagesPtBR,
    ...dashboardHomeUiMessagesPtBR,
    ...appShellMessagesPtBR,
    ...activityLogPagePtBR,
    ...stepsPagePtBR,
    ...heartHealthUiMessagesPtBR,
    ...rotaUploadPagePtBR,
    ...sleepUiMessagesPtBR,
    ...rotaFlowPagesPtBR,
    ...accountLegalShellPtBR,
    ...guidedHintsTourEn,
    'settings.loading': 'Carregando configurações…',
    'settings.backAria': 'Voltar',
    'settings.contactSupport': 'Falar com o suporte',
    'settings.footerVersion': 'Versão {version}',
    'dashboard.bodyClock.statusShortLearning': 'Aprendendo seu ritmo',
    'dashboard.bodyClock.statusShortWellAligned': 'Bem alinhado',
    'dashboard.bodyClock.statusShortSlightlyOut': 'Levemente fora de sincronia',
    'dashboard.bodyClock.statusShortMisaligned': 'Fora de alinhamento',
}

export default messages
