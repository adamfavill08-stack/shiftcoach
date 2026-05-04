import { batch1Pl } from '@/lib/i18n/batches/batch1-pl'
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
import { accountLegalShellPl } from '@/lib/i18n/accountLegalShellMessages'
import { guidedHintsTourEn } from '@/lib/i18n/guidedHintsTour'

const messages: Record<string, string> = {
    ...batch1Pl,
    ...calendarMessagesPl,
    ...mealTimingCoachPl,
    ...nutritionSettingsPl,
    ...moodFocusMessagesPl,
    ...blogArticleOverridesPl,
    ...dataPrivacySettingsPl,
    ...settingsAppearancePl,
    ...settingsSubscriptionPl,
    ...profileSettingsPagePl,
    ...settingsSupportUiPl,
    ...wearablesSetupPageExtraPl,
    ...dashboardBannerMessagesPl,
    ...dashboardHomeUiMessagesPl,
    ...appShellMessagesPl,
    ...activityLogPagePl,
    ...stepsPagePl,
    ...heartHealthUiMessagesPl,
    ...rotaUploadPagePl,
    ...sleepUiMessagesPl,
    ...rotaFlowPagesPl,
    ...accountLegalShellPl,
    ...guidedHintsTourEn,
    'settings.loading': 'Ładowanie ustawień…',
    'settings.backAria': 'Wstecz',
    'settings.contactSupport': 'Kontakt z pomocą',
    'settings.footerVersion': 'Wersja {version}',
    'dashboard.bodyClock.statusShortLearning': 'Poznajemy twój rytm',
    'dashboard.bodyClock.statusShortWellAligned': 'Dobrze zsynchronizowany',
    'dashboard.bodyClock.statusShortSlightlyOut': 'Lekko rozstrojony',
    'dashboard.bodyClock.statusShortMisaligned': 'Rozstrojony',
}

export default messages
