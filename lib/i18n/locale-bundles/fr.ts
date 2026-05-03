import { batch1Fr } from '@/lib/i18n/batches/batch1-fr'
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
import { accountLegalShellFr } from '@/lib/i18n/accountLegalShellMessages'
import { frBundleShellParity } from './frBundleShellParity'

const messages: Record<string, string> = {
    ...batch1Fr,
    ...calendarMessagesFr,
    ...mealTimingCoachFr,
    ...nutritionSettingsFr,
    ...moodFocusMessagesFr,
    ...blogArticleOverridesFr,
    ...dataPrivacySettingsFr,
    ...settingsAppearanceFr,
    ...settingsSubscriptionFr,
    ...profileSettingsPageFr,
    ...settingsSupportUiFr,
    ...wearablesSetupPageExtraFr,
    ...dashboardBannerMessagesFr,
    ...dashboardHomeUiMessagesFr,
    ...appShellMessagesFr,
    ...activityLogPageFr,
    ...stepsPageFr,
    ...heartHealthUiMessagesFr,
    ...rotaUploadPageFr,
    ...sleepUiMessagesFr,
    ...rotaFlowPagesFr,
    ...accountLegalShellFr,
    ...frBundleShellParity,
    'settings.loading': 'Chargement des réglages…',
    'settings.backAria': 'Retour',
    'settings.contactSupport': 'Contacter le support',
    'settings.footerVersion': 'Version {version}',
    'dashboard.bodyClock.statusShortLearning': 'Apprentissage de votre rythme',
    'dashboard.bodyClock.statusShortWellAligned': 'Bien aligné',
    'dashboard.bodyClock.statusShortSlightlyOut': 'Légèrement décalé',
    'dashboard.bodyClock.statusShortMisaligned': 'Désaligné',
}

export default messages
