/** Account deletion, legal page chrome, shift-worker info, verify-onboarding shell — merged in language-provider. */

export const accountLegalShellEn: Record<string, string> = {
  'account.deleteRequest.title': 'Request account deletion',
  'account.deleteRequest.intro':
    'Use this page if you cannot sign in. If you can sign in, use the in-app deletion flow at',
  'account.deleteRequest.emailLabel': 'Account email',
  'account.deleteRequest.emailPh': 'you@example.com',
  'account.deleteRequest.reasonLabel': 'Reason (optional)',
  'account.deleteRequest.reasonPh': 'Optional details to help us process your request.',
  'account.deleteRequest.submit': 'Submit deletion request',
  'account.deleteRequest.submitting': 'Submitting…',
  'account.deleteRequest.success':
    'Request received. We will process account/data deletion for this email.',
  'account.deleteRequest.error': 'Unable to submit request',

  'account.delete.loading': 'Loading…',
  'account.delete.title': 'Delete Account',
  'account.delete.signInTitle': 'Delete Account',
  'account.delete.signInBody': 'Please sign in to delete your account.',
  'account.delete.signInCta': 'Sign In',
  'account.delete.backHome': 'Back to home',
  'account.delete.confirmHint': 'Please type DELETE to confirm',
  'account.delete.toastConfirm': 'Please type DELETE to confirm',
  'account.delete.toastNeedSignIn': 'Please sign in to delete your account',
  'account.delete.toastFailed': 'Failed to delete account',
  'account.delete.toastSuccess': 'Account deleted successfully',
  'account.delete.toastRetry': 'Failed to delete account. Please try again.',
  'account.delete.dangerTitle': 'This cannot be undone',
  'account.delete.dangerBody':
    'Deleting your account removes your profile, rota, and associated health data from ShiftCoach.',
  'account.delete.typeDelete': 'Type DELETE to confirm',
  'account.delete.permanently': 'Delete my account permanently',
  'account.delete.deleting': 'Deleting…',
  'account.delete.subtitleSignedIn':
    'This action cannot be undone. All your data will be permanently deleted.',
  'account.delete.listHeading': 'What will be deleted:',
  'account.delete.bulletSleep': 'All sleep logs and data',
  'account.delete.bulletRota': 'All shift patterns and rota',
  'account.delete.bulletNutrition': 'All nutrition logs',
  'account.delete.bulletActivity': 'All activity data',
  'account.delete.bulletProfile': 'Your profile and settings',
  'account.delete.bulletCalendar': 'All calendar events',
  'account.delete.bulletBilling': 'All subscription and payment information',
  'account.delete.cancel': 'Cancel',
  'account.delete.confirm': 'Confirm Deletion',
  'account.delete.placeholderDelete': 'Type DELETE',
  'account.delete.goHome': 'Go to Home',
  'account.delete.footerNote': 'You can also delete your account from the app settings.',
  'account.delete.footerWebRequest': 'Web deletion request',
  'account.delete.footerPrivacy': 'View Privacy Policy',

  'legal.privacy.title': 'Privacy Policy',
  'legal.privacy.lastUpdated': 'Last updated: {date}',
  'legal.privacy.englishNote':
    'The legal text below is provided in English. A full translation may be added in a future update.',

  'legal.terms.title': 'Terms of Service',
  'legal.terms.lastUpdated': 'Last updated: {date}',
  'legal.terms.englishNote':
    'The legal text below is provided in English. A full translation may be added in a future update.',

  'legal.healthNotice.title': 'Health data notice',
  'legal.healthNotice.lastUpdated': 'Last updated: {date}',
  'legal.healthNotice.englishNote':
    'The notice below is provided in English. A full translation may be added in a future update.',

  'shiftWorker.health.title': 'Shift worker health',
  'shiftWorker.health.backAria': 'Back to dashboard',
  'shiftWorker.health.p1':
    "Shift work doesn't just change your timetable – it shifts your body clock, hormones and recovery needs. Long, irregular hours and night shifts mean your brain and body are often trying to be \"on\" when they naturally want to be asleep.",
  'shiftWorker.health.p2':
    'ShiftCoach adjusts your calories, sleep goals and movement targets for your rota, age, weight, height and sex so that recommendations stay realistic and protective instead of 9–5 based.',
  'shiftWorker.health.pillarsTitle': '3 pillars we track for you',
  'shiftWorker.health.pillar1Title': 'Sleep & recovery:',
  'shiftWorker.health.pillar1Body':
    'how much sleep you get, when it happens and how big your sleep debt is.',
  'shiftWorker.health.pillar2Title': 'Shift pattern:',
  'shiftWorker.health.pillar2Body':
    'day vs night vs rotating, how demanding your shift is and how often you switch.',
  'shiftWorker.health.pillar3Title': 'Movement & activity:',
  'shiftWorker.health.pillar3Body': 'steps, active minutes and how consistent your movement is across the week.',
  'shiftWorker.health.meaningTitle': 'What this means for you',
  'shiftWorker.health.meaning1':
    'Calorie and movement goals that match how hard your shifts actually are.',
  'shiftWorker.health.meaning2':
    'Sleep targets that account for night work and recovery days, not just a 9–5 schedule.',
  'shiftWorker.health.meaning3':
    'Simple next steps when your body is overworked, under-rested or both.',

  'shiftWorker.goals.title': 'Set my goals',
  'shiftWorker.goals.intro':
    'Shift work makes it harder to hit the usual "perfect" goals. Here you can set realistic targets and time frames for your own shifts so you always have something clear to aim for.',
  'shiftWorker.goals.sleepTitle': 'Sleep & recovery goals',
  'shiftWorker.goals.sleepHint':
    'Use these as prompts and type your own answers into notes or your plan.',
  'shiftWorker.goals.sleepLi1':
    'Main goal: e.g. "Average 7h sleep on day shifts and 6.5h across night blocks by 12 weeks from now."',
  'shiftWorker.goals.sleepLi2':
    'Short-term target (next 2 weeks): choose a simple step like "Add one 20-minute wind-down before bed on three nights each week."',
  'shiftWorker.goals.sleepLi3':
    'Recovery after hard runs: set a rule such as "After every 3+ night run I will protect one full recovery day with a minimum of 8 hours in bed."',
  'shiftWorker.goals.activityTitle': 'Activity & weight goals',
  'shiftWorker.goals.activityLi1':
    'Steps target: e.g. "Hit 7,000 steps on work days and 9,000 on days off for the next 4 weeks."',
  'shiftWorker.goals.activityLi2':
    'Strength or movement: choose 1–2 types (walks, stretches, gym) and link them to shift times, such as "10-minute walk before each late shift".',
  'shiftWorker.goals.activityLi3':
    'Weight trend: instead of a crash diet, pick a gentle direction such as "Lose 0.3–0.5 kg per week for 12 weeks" or "Maintain weight but reduce waist size by 3 cm."',
  'shiftWorker.goals.eatingTitle': 'Eating & cravings on shifts',
  'shiftWorker.goals.eatingLi1':
    'Night-shift rule: for example "No big hot meals between 1–5am – only small planned snacks."',
  'shiftWorker.goals.eatingLi2':
    'Binge-risk goal: pick one pattern to change such as "No eating from the car or sofa after night shifts for 30 days."',
  'shiftWorker.goals.eatingLi3':
    'Preparation goal: aim to prep 1–2 high-protein meals/snacks before each run of nights so the vending machine is a back-up, not the plan.',
  'shiftWorker.goals.timeTitle': 'Time frames that work for shift workers',
  'shiftWorker.goals.timeLi1':
    '1-shift goals: tiny actions you can tick off today (walk before shift, bring one packed meal, get to bed by a set time).',
  'shiftWorker.goals.timeLi2':
    '1-week goals: patterns across a rota week – for example "Log sleep after every night" or "3 movement sessions even during a busy week."',
  'shiftWorker.goals.timeLi3':
    '4–12 week goals: bigger changes like weight, energy, or clothes fitting differently.',
  'shiftWorker.goals.timeFooter':
    'The most effective plans for shift work are flexible but specific: clear targets, but room to move things on tough runs. Adjust goals after each rota rather than waiting for the "perfect" month.',

  'shiftWorker.diet.title': 'Diet for shift workers',
  'shiftWorker.diet.whyTitle': 'Why diet feels harder on shifts',
  'shiftWorker.diet.whyP1':
    'Shift work changes when your brain thinks it\'s "day" or "night". At night your body is programmed to slow digestion, lower metabolism and increase cravings. That\'s why it feels so easy to over-eat junk on nights and still feel tired.',
  'shiftWorker.diet.whyP2':
    'Standard diet rules assume a 9–5 routine. ShiftCoach adapts your plan to your rota, sleep pattern, age, sex, weight and height so calories and meal timing fit real life on shifts.',
  'shiftWorker.diet.issuesTitle': 'Common health issues in shift workers',
  'shiftWorker.diet.issuesLi1':
    'Weight gain and belly fat: eating large meals at night makes your body store more as fat and burn less at rest.',
  'shiftWorker.diet.issuesLi2':
    'Blood sugar swings: long gaps with no food followed by huge meals or constant snacking drive cravings and energy crashes.',
  'shiftWorker.diet.issuesLi3':
    'Heartburn and gut problems: heavy, greasy food close to sleep time is harder to digest when your stomach is in "night mode".',
  'shiftWorker.diet.issuesLi4':
    'Higher risk of diabetes and heart disease: years of night eating, sleep loss and stress push blood pressure and blood sugar in the wrong direction.',
  'shiftWorker.diet.issuesFooter':
    'You can\'t change your rota overnight, but the right meal timing and portions can massively reduce these risks.',
  'shiftWorker.diet.structureTitle': 'Simple meal structure that works',
  'shiftWorker.diet.dayLabel': 'For day shifts:',
  'shiftWorker.diet.dayLi1': 'Main meal in the middle of the day (not late at night).',
  'shiftWorker.diet.dayLi2': 'Light breakfast and lighter evening meal to protect sleep.',
  'shiftWorker.diet.dayLi3':
    'Aim for 20–30 g of protein in each main meal to keep you full.',
  'shiftWorker.diet.nightLabel': 'For night shifts:',
  'shiftWorker.diet.nightLi1': 'Eat your largest meal 2–3 hours before shift.',
  'shiftWorker.diet.nightLi2':
    'During the night, use small, protein-based snacks instead of big hot meals.',
  'shiftWorker.diet.nightLi3':
    'After shift, have a light breakfast and then sleep – avoid heavy "post-night" dinners.',
  'shiftWorker.diet.profileTitle': 'How ShiftCoach uses your profile',
  'shiftWorker.diet.profileLi1':
    'Age, sex, height, weight: set your base calorie needs and macro balance.',
  'shiftWorker.diet.profileLi2':
    'Rota & shift demand: adjust calories up or down when shifts are extra heavy or when you\'re in recovery.',
  'shiftWorker.diet.profileLi3':
    'Sleep debt and body clock: nudge calories slightly down on weeks when night eating is highest and sleep is short.',
  'shiftWorker.diet.profileFooter':
    'The goal isn\'t perfection – it\'s to make healthy choices easier on your actual shifts, so weight, energy and long-term health move in the right direction without extreme diets.',

  'verifyOnboarding.title': 'Onboarding verification',
  'verifyOnboarding.subtitle': 'Checking migration status and onboarding flow',
  'verifyOnboarding.loading': 'Running checks…',
  'verifyOnboarding.runAgain': 'Run checks again',
  'verifyOnboarding.backDashboard': 'Back to dashboard',
  'verifyOnboarding.back': 'Back',
  'verifyOnboarding.viewDetails': 'View details',
  'verifyOnboarding.sectionMigration': 'Database Migration',
  'verifyOnboarding.sectionProfile': 'Profile Data',
  'verifyOnboarding.sectionOnboarding': 'Onboarding Flow',
  'verifyOnboarding.testOnboarding': 'Test Onboarding',
  'verifyOnboarding.actionRequired': 'Action Required',
  'verifyOnboarding.migrationFailBody':
    'The database migration has not been run. Age and date_of_birth data will not be saved.',
  'verifyOnboarding.migrationStep1': 'Open your Supabase Dashboard',
  'verifyOnboarding.migrationStep2': 'Go to SQL Editor',
  'verifyOnboarding.migrationStep3': 'Copy the contents of:',
  'verifyOnboarding.migrationStep4': 'Paste and run the SQL',
  'verifyOnboarding.migrationStep5': 'Re-check this page to verify',
}

export const accountLegalShellEs: Record<string, string> = {
  ...accountLegalShellEn,
  'account.deleteRequest.title': 'Solicitar eliminación de cuenta',
  'account.deleteRequest.intro':
    'Usa esta página si no puedes iniciar sesión. Si puedes, usa el flujo en la app en',
  'account.deleteRequest.emailLabel': 'Correo de la cuenta',
  'account.deleteRequest.reasonLabel': 'Motivo (opcional)',
  'account.deleteRequest.submit': 'Enviar solicitud',
  'account.deleteRequest.submitting': 'Enviando…',
  'account.deleteRequest.success':
    'Solicitud recibida. Procesaremos la eliminación de cuenta/datos para este correo.',
  'account.deleteRequest.error': 'No se pudo enviar la solicitud',

  'account.delete.title': 'Eliminar cuenta',
  'account.delete.signInBody': 'Inicia sesión para eliminar tu cuenta.',
  'account.delete.signInCta': 'Iniciar sesión',
  'account.delete.backHome': 'Volver al inicio',
  'legal.privacy.title': 'Política de privacidad',
  'legal.terms.title': 'Términos del servicio',
  'shiftWorker.health.title': 'Salud del trabajador por turnos',
  'shiftWorker.health.backAria': 'Volver al inicio',
  'shiftWorker.goals.title': 'Definir mis objetivos',
  'shiftWorker.diet.title': 'Alimentación en turnos',
}

export const accountLegalShellDe: Record<string, string> = {
  ...accountLegalShellEn,
  'account.deleteRequest.title': 'Kontolöschung beantragen',
  'account.deleteRequest.emailLabel': 'Konto-E-Mail',
  'account.deleteRequest.submit': 'Antrag senden',
  'account.deleteRequest.submitting': 'Wird gesendet…',
  'account.delete.title': 'Konto löschen',
  'account.delete.signInCta': 'Anmelden',
  'legal.privacy.title': 'Datenschutzerklärung',
  'legal.terms.title': 'Nutzungsbedingungen',
  'shiftWorker.health.title': 'Gesundheit im Schichtdienst',
  'shiftWorker.health.backAria': 'Zurück zum Start',
  'shiftWorker.goals.title': 'Meine Ziele festlegen',
  'shiftWorker.diet.title': 'Ernährung im Schichtdienst',
}

export const accountLegalShellFr: Record<string, string> = {
  ...accountLegalShellEn,
  'legal.privacy.title': 'Politique de confidentialité',
  'legal.terms.title': 'Conditions d’utilisation',
  'shiftWorker.health.title': 'Santé des travailleurs postés',
  'shiftWorker.goals.title': 'Définir mes objectifs',
  'shiftWorker.diet.title': 'Alimentation en horaires décalés',
}

export const accountLegalShellPtBR: Record<string, string> = {
  ...accountLegalShellEn,
  'legal.privacy.title': 'Política de privacidade',
  'legal.terms.title': 'Termos de serviço',
  'shiftWorker.health.title': 'Saúde do trabalhador em turnos',
  'shiftWorker.goals.title': 'Definir minhas metas',
  'shiftWorker.diet.title': 'Alimentação em turnos',
}

export const accountLegalShellPl: Record<string, string> = {
  ...accountLegalShellEn,
  'legal.privacy.title': 'Polityka prywatności',
  'legal.terms.title': 'Regulamin',
  'shiftWorker.health.title': 'Zdrowie pracowników zmianowych',
  'shiftWorker.goals.title': 'Ustal moje cele',
  'shiftWorker.diet.title': 'Dieta na pracę zmianową',
}
