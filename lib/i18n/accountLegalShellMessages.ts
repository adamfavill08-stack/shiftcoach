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
  'shiftWorker.health.kicker': 'Guide',
  'shiftWorker.health.lede':
    'Science-backed context for sleep, shifts, and recovery—personalised to your rota.',
  'shiftWorker.health.readTime': '4 min read',
  'shiftWorker.health.heroAlt':
    'Illustration of shift workers and healthy food, matching the dashboard explore carousel.',
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
  'shiftWorker.health.footerTip':
    'Your dashboard updates as you log sleep and shifts—open it anytime to see how these pillars apply to you.',

  'shiftWorker.goals.title': 'Set my goals',
  'shiftWorker.goals.kicker': 'Planning',
  'shiftWorker.goals.lede':
    'Create specific targets and time frames that fit your shifts, sleep and health challenges.',
  'shiftWorker.goals.readTime': '5 min read',
  'shiftWorker.goals.heroAlt':
    'Goals and progress imagery for shift workers, matching the dashboard explore carousel.',
  'shiftWorker.goals.footerTip':
    'Revisit these targets from your dashboard and profile whenever your rota changes—small edits beat all-or-nothing plans.',
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
  'shiftWorker.diet.kicker': 'Nutrition',
  'shiftWorker.diet.lede':
    'Shift-worker diets, common health issues, and how the right food timing helps protect you.',
  'shiftWorker.diet.readTime': '6 min read',
  'shiftWorker.diet.heroAlt':
    'Healthy meals and lifestyle imagery for shift workers, matching the dashboard explore carousel.',
  'shiftWorker.diet.footerTip':
    'Log meals and open nutrition insights in ShiftCoach—they stay aligned when your shifts and sleep change.',
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
  'account.deleteRequest.title': 'Solicitar eliminación de cuenta',
  'account.deleteRequest.intro':
    'Usa esta página si no puedes iniciar sesión. Si puedes iniciar sesión, usa el flujo de eliminación dentro de la app en',
  'account.deleteRequest.emailLabel': 'Correo de la cuenta',
  'account.deleteRequest.emailPh': 'tu@ejemplo.com',
  'account.deleteRequest.reasonLabel': 'Motivo (opcional)',
  'account.deleteRequest.reasonPh': 'Detalles opcionales para ayudarnos a procesar tu solicitud.',
  'account.deleteRequest.submit': 'Enviar solicitud de eliminación',
  'account.deleteRequest.submitting': 'Enviando…',
  'account.deleteRequest.success':
    'Solicitud recibida. Procesaremos la eliminación de la cuenta y los datos asociados a este correo.',
  'account.deleteRequest.error': 'No se pudo enviar la solicitud',

  'account.delete.loading': 'Cargando…',
  'account.delete.title': 'Eliminar cuenta',
  'account.delete.signInTitle': 'Eliminar cuenta',
  'account.delete.signInBody': 'Inicia sesión para eliminar tu cuenta.',
  'account.delete.signInCta': 'Iniciar sesión',
  'account.delete.backHome': 'Volver al inicio',
  'account.delete.confirmHint': 'Escribe DELETE para confirmar',
  'account.delete.toastConfirm': 'Escribe DELETE para confirmar',
  'account.delete.toastNeedSignIn': 'Inicia sesión para eliminar tu cuenta',
  'account.delete.toastFailed': 'No se pudo eliminar la cuenta',
  'account.delete.toastSuccess': 'Cuenta eliminada correctamente',
  'account.delete.toastRetry': 'No se pudo eliminar la cuenta. Inténtalo de nuevo.',
  'account.delete.dangerTitle': 'Esta acción no se puede deshacer',
  'account.delete.dangerBody':
    'Al eliminar tu cuenta se borran tu perfil, tu calendario de turnos y los datos de salud asociados en ShiftCoach.',
  'account.delete.typeDelete': 'Escribe DELETE para confirmar',
  'account.delete.permanently': 'Eliminar mi cuenta de forma permanente',
  'account.delete.deleting': 'Eliminando…',
  'account.delete.subtitleSignedIn':
    'Esta acción no se puede deshacer. Todos tus datos se eliminarán de forma permanente.',
  'account.delete.listHeading': 'Qué se eliminará:',
  'account.delete.bulletSleep': 'Todos los registros y datos de sueño',
  'account.delete.bulletRota': 'Todos los patrones de turnos y el calendario',
  'account.delete.bulletNutrition': 'Todos los registros de nutrición',
  'account.delete.bulletActivity': 'Todos los datos de actividad',
  'account.delete.bulletProfile': 'Tu perfil y ajustes',
  'account.delete.bulletCalendar': 'Todos los eventos del calendario',
  'account.delete.bulletBilling': 'Toda la información de suscripción y pagos',
  'account.delete.cancel': 'Cancelar',
  'account.delete.confirm': 'Confirmar eliminación',
  'account.delete.placeholderDelete': 'Escribe DELETE',
  'account.delete.goHome': 'Ir al inicio',
  'account.delete.footerNote': 'También puedes eliminar tu cuenta desde los ajustes de la app.',
  'account.delete.footerWebRequest': 'Solicitud de eliminación web',
  'account.delete.footerPrivacy': 'Ver política de privacidad',

  'legal.privacy.title': 'Política de privacidad',
  'legal.privacy.lastUpdated': 'Última actualización: {date}',
  'legal.privacy.englishNote':
    'El texto legal siguiente está en inglés. Una traducción jurídica revisada podría añadirse en una actualización futura.',

  'legal.terms.title': 'Términos del servicio',
  'legal.terms.lastUpdated': 'Última actualización: {date}',
  'legal.terms.englishNote':
    'El texto legal siguiente está en inglés. Una traducción jurídica revisada podría añadirse en una actualización futura.',

  'legal.healthNotice.title': 'Aviso sobre datos de salud',
  'legal.healthNotice.lastUpdated': 'Última actualización: {date}',
  'legal.healthNotice.englishNote':
    'El aviso siguiente está en inglés. Una traducción revisada podría añadirse en una actualización futura.',

  'shiftWorker.health.title': 'Salud del trabajador por turnos',
  'shiftWorker.health.kicker': 'Guía',
  'shiftWorker.health.lede':
    'Contexto basado en evidencia sobre sueño, turnos y recuperación, adaptado a tu calendario.',
  'shiftWorker.health.readTime': 'Lectura de 4 min',
  'shiftWorker.health.heroAlt':
    'Ilustración de trabajadores por turnos y alimentación saludable, alineada con el carrusel del panel.',
  'shiftWorker.health.backAria': 'Volver al panel',
  'shiftWorker.health.p1':
    'El trabajo por turnos no solo cambia tu horario: desplaza tu reloj biológico, tus hormonas y tus necesidades de recuperación. Jornadas largas e irregulares y los turnos de noche hacen que cerebro y cuerpo intenten estar «activos» cuando por naturaleza querrían dormir.',
  'shiftWorker.health.p2':
    'ShiftCoach ajusta calorías, objetivos de sueño y de movimiento según tu calendario de turnos, edad, peso, talla y sexo, para que las recomendaciones sean realistas y protectoras, no pensadas solo para un horario de 9 a 5.',
  'shiftWorker.health.pillarsTitle': '3 pilares que seguimos por ti',
  'shiftWorker.health.pillar1Title': 'Sueño y recuperación:',
  'shiftWorker.health.pillar1Body':
    'cuánto duermes, cuándo lo haces y cuánta deuda de sueño acumulas.',
  'shiftWorker.health.pillar2Title': 'Patrón de turnos:',
  'shiftWorker.health.pillar2Body':
    'día frente a noche frente a rotación, qué tan exigente es el turno y con qué frecuencia cambias.',
  'shiftWorker.health.pillar3Title': 'Movimiento y actividad:',
  'shiftWorker.health.pillar3Body':
    'pasos, minutos activos y qué tan constante es tu movimiento a lo largo de la semana.',
  'shiftWorker.health.meaningTitle': 'Qué implica para ti',
  'shiftWorker.health.meaning1':
    'Objetivos de calorías y movimiento acordes con lo duros que son realmente tus turnos.',
  'shiftWorker.health.meaning2':
    'Metas de sueño que tienen en cuenta el trabajo nocturno y los días de recuperación, no solo un horario de oficina.',
  'shiftWorker.health.meaning3':
    'Próximos pasos sencillos cuando el cuerpo está sobrecargado, descansando de menos o ambas cosas.',
  'shiftWorker.health.footerTip':
    'El panel se actualiza cuando registras sueño y turnos; ábrelo cuando quieras ver cómo aplican estos pilares a tu caso.',

  'shiftWorker.goals.title': 'Definir mis objetivos',
  'shiftWorker.goals.kicker': 'Planificación',
  'shiftWorker.goals.lede':
    'Crea metas concretas y plazos que encajen con tus turnos, tu sueño y tus retos de salud.',
  'shiftWorker.goals.readTime': 'Lectura de 5 min',
  'shiftWorker.goals.heroAlt':
    'Imagen de metas y progreso para trabajadores por turnos, alineada con el carrusel del panel.',
  'shiftWorker.goals.footerTip':
    'Revisa estas metas desde el panel y el perfil cuando cambie tu calendario: pequeños ajustes ganan a los planes «todo o nada».',
  'shiftWorker.goals.intro':
    'Los turnos dificultan alcanzar metas «perfectas» de manual. Aquí puedes fijar objetivos y plazos realistas para tus propios turnos y tener siempre algo claro a lo que aspirar.',
  'shiftWorker.goals.sleepTitle': 'Metas de sueño y recuperación',
  'shiftWorker.goals.sleepHint':
    'Úsalas como guía y escribe tus propias respuestas en notas o en tu plan.',
  'shiftWorker.goals.sleepLi1':
    'Meta principal: p. ej. «Promediar 7 h de sueño en turnos de día y 6,5 h en bloques de noche en 12 semanas».',
  'shiftWorker.goals.sleepLi2':
    'Meta a corto plazo (2 semanas): un paso sencillo como «Añadir 20 min de relajación antes de dormir tres noches por semana».',
  'shiftWorker.goals.sleepLi3':
    'Recuperación tras rachas duras: una regla del tipo «Después de cada racha de 3+ noches protegeré un día completo de recuperación con mínimo 8 h en cama».',
  'shiftWorker.goals.activityTitle': 'Metas de actividad y peso',
  'shiftWorker.goals.activityLi1':
    'Pasos: p. ej. «Alcanzar 7.000 pasos en días laborables y 9.000 en días libres durante las próximas 4 semanas».',
  'shiftWorker.goals.activityLi2':
    'Fuerza o movimiento: elige 1–2 tipos (caminatas, estiramientos, gimnasio) y enlázalos al turno, p. ej. «10 min de caminata antes de cada turno tarde».',
  'shiftWorker.goals.activityLi3':
    'Tendencia de peso: en lugar de una dieta extrema, una dirección suave como «Bajar 0,3–0,5 kg por semana durante 12 semanas» o «Mantener peso pero reducir 3 cm de cintura».',
  'shiftWorker.goals.eatingTitle': 'Alimentación y antojos en turnos',
  'shiftWorker.goals.eatingLi1':
    'Regla para turno de noche: p. ej. «Sin comidas calientes grandes entre la 1 y las 5: solo snacks planificados».',
  'shiftWorker.goals.eatingLi2':
    'Meta frente a atracones: cambia un patrón, p. ej. «Sin comer en el coche o el sofá tras los turnos de noche durante 30 días».',
  'shiftWorker.goals.eatingLi3':
    'Meta de preparación: intenta preparar 1–2 comidas o tentempiés ricos en proteína antes de cada racha de noches para que la máquina expendedora sea plan B, no plan A.',
  'shiftWorker.goals.timeTitle': 'Plazos que funcionan con turnos',
  'shiftWorker.goals.timeLi1':
    'Metas de un turno: acciones pequeñas que puedes tachar hoy (caminar antes del turno, llevar una comida preparada, acostarse a una hora concreta).',
  'shiftWorker.goals.timeLi2':
    'Metas de 1 semana: hábitos a lo largo de la semana de guardia, p. ej. «Registrar el sueño tras cada noche» o «3 sesiones de movimiento incluso en semana cargada».',
  'shiftWorker.goals.timeLi3':
    'Metas de 4–12 semanas: cambios mayores como peso, energía o cómo te sienta la ropa.',
  'shiftWorker.goals.timeFooter':
    'Los planes más efectivos para turnos son flexibles pero concretos: metas claras con margen para moverlas en rachas duras. Ajusta tras cada calendario en lugar de esperar el mes «perfecto».',

  'shiftWorker.diet.title': 'Alimentación en turnos',
  'shiftWorker.diet.kicker': 'Nutrición',
  'shiftWorker.diet.lede':
    'Dieta en trabajadores por turnos, problemas de salud frecuentes y cómo el momento de comer ayuda a protegerte.',
  'shiftWorker.diet.readTime': 'Lectura de 6 min',
  'shiftWorker.diet.heroAlt':
    'Imagen de comidas saludables y estilo de vida para turnos, alineada con el carrusel del panel.',
  'shiftWorker.diet.footerTip':
    'Registra comidas y abre los análisis de nutrición en ShiftCoach: se mantienen alineados cuando cambian turnos y sueño.',
  'shiftWorker.diet.whyTitle': 'Por qué la dieta cuesta más con turnos',
  'shiftWorker.diet.whyP1':
    'Los turnos cambian cuándo el cerebro cree que es «día» o «noche». Por la noche el cuerpo ralentiza la digestión, baja el metabolismo y aumentan los antojos; por eso cuesta poco picar ultraprocesados de noche y seguir cansado.',
  'shiftWorker.diet.whyP2':
    'Las reglas clásicas asumen rutina de 9 a 5. ShiftCoach adapta tu plan a tu calendario, sueño, edad, sexo, peso y talla para que calorías y horarios encajen con la vida real en turnos.',
  'shiftWorker.diet.issuesTitle': 'Problemas de salud frecuentes en turnos',
  'shiftWorker.diet.issuesLi1':
    'Aumento de peso y grasa abdominal: comidas grandes de noche favorecen que el cuerpo almacene más grasa y queme menos en reposo.',
  'shiftWorker.diet.issuesLi2':
    'Picos de glucosa: muchas horas sin comer seguidas de comidas enormes o picoteo constante disparan antojos y bajones de energía.',
  'shiftWorker.diet.issuesLi3':
    'Acidez y molestias digestivas: comida pesada y grasienta cerca de dormir cuesta más cuando el estómago está en «modo noche».',
  'shiftWorker.diet.issuesLi4':
    'Mayor riesgo de diabetes y enfermedad cardiovascular: años de comer de noche, falta de sueño y estrés empujan presión arterial y glucosa en la dirección equivocada.',
  'shiftWorker.diet.issuesFooter':
    'No puedes cambiar tu calendario de un día para otro, pero el momento y las porciones adecuados reducen muchísimo esos riesgos.',
  'shiftWorker.diet.structureTitle': 'Estructura de comidas sencilla que funciona',
  'shiftWorker.diet.dayLabel': 'Para turnos de día:',
  'shiftWorker.diet.dayLi1': 'Comida principal a mitad del día (no tarde por la noche).',
  'shiftWorker.diet.dayLi2': 'Desayuno ligero y cena más ligera para proteger el sueño.',
  'shiftWorker.diet.dayLi3':
    'Intenta 20–30 g de proteína en cada comida principal para mantenerte saciado.',
  'shiftWorker.diet.nightLabel': 'Para turnos de noche:',
  'shiftWorker.diet.nightLi1': 'Haz la comida más abundante 2–3 h antes del turno.',
  'shiftWorker.diet.nightLi2':
    'Durante la noche usa tentempiés pequeños con proteína en lugar de platos calientes grandes.',
  'shiftWorker.diet.nightLi3':
    'Tras el turno, un desayuno ligero y luego dormir; evita cenas muy copiosas «post-noche».',
  'shiftWorker.diet.profileTitle': 'Cómo ShiftCoach usa tu perfil',
  'shiftWorker.diet.profileLi1':
    'Edad, sexo, talla y peso: fijan tus necesidades calóricas base y el equilibrio de macronutrientes.',
  'shiftWorker.diet.profileLi2':
    'Calendario y exigencia del turno: ajustan calorías al alza o a la baja cuando los turnos son más duros o estás en recuperación.',
  'shiftWorker.diet.profileLi3':
    'Deuda de sueño y reloj biológico: suavizan calorías en semanas con mucha comida nocturna y poco sueño.',
  'shiftWorker.diet.profileFooter':
    'La meta no es la perfección: es que las decisiones saludables sean más fáciles en tus turnos reales, para que peso, energía y salud a largo plazo vayan en la buena dirección sin dietas extremas.',

  'verifyOnboarding.title': 'Verificación del onboarding',
  'verifyOnboarding.subtitle': 'Comprobación de migraciones y flujo de onboarding',
  'verifyOnboarding.loading': 'Ejecutando comprobaciones…',
  'verifyOnboarding.runAgain': 'Ejecutar de nuevo',
  'verifyOnboarding.backDashboard': 'Volver al panel',
  'verifyOnboarding.back': 'Atrás',
  'verifyOnboarding.viewDetails': 'Ver detalles',
  'verifyOnboarding.sectionMigration': 'Migración de base de datos',
  'verifyOnboarding.sectionProfile': 'Datos del perfil',
  'verifyOnboarding.sectionOnboarding': 'Flujo de onboarding',
  'verifyOnboarding.testOnboarding': 'Probar onboarding',
  'verifyOnboarding.actionRequired': 'Acción necesaria',
  'verifyOnboarding.migrationFailBody':
    'No se ha ejecutado la migración de base de datos. No se guardarán la edad ni la fecha de nacimiento.',
  'verifyOnboarding.migrationStep1': 'Abre el panel de Supabase',
  'verifyOnboarding.migrationStep2': 'Ve al editor SQL',
  'verifyOnboarding.migrationStep3': 'Copia el contenido de:',
  'verifyOnboarding.migrationStep4': 'Pégalo y ejecuta el SQL',
  'verifyOnboarding.migrationStep5': 'Vuelve a esta página para verificar',
}

export { accountLegalShellDe } from './accountLegalShellDeMessages'

export const accountLegalShellFr: Record<string, string> = {
  'account.deleteRequest.title': 'Demander la suppression du compte',
  'account.deleteRequest.intro':
    'Utilisez cette page si vous ne pouvez pas vous connecter. Si vous pouvez vous connecter, utilisez le flux de suppression dans l’application sur',
  'account.deleteRequest.emailLabel': 'E-mail du compte',
  'account.deleteRequest.emailPh': 'vous@exemple.com',
  'account.deleteRequest.reasonLabel': 'Motif (facultatif)',
  'account.deleteRequest.reasonPh': 'Détails facultatifs pour nous aider à traiter votre demande.',
  'account.deleteRequest.submit': 'Envoyer la demande de suppression',
  'account.deleteRequest.submitting': 'Envoi en cours…',
  'account.deleteRequest.success':
    'Demande reçue. Nous traiterons la suppression du compte et des données associées à cet e-mail.',
  'account.deleteRequest.error': 'Impossible d’envoyer la demande',

  'account.delete.loading': 'Chargement…',
  'account.delete.title': 'Supprimer le compte',
  'account.delete.signInTitle': 'Supprimer le compte',
  'account.delete.signInBody': 'Connectez-vous pour supprimer votre compte.',
  'account.delete.signInCta': 'Se connecter',
  'account.delete.backHome': "Retour à l'accueil",
  'account.delete.confirmHint': 'Tapez DELETE pour confirmer',
  'account.delete.toastConfirm': 'Tapez DELETE pour confirmer',
  'account.delete.toastNeedSignIn': 'Connectez-vous pour supprimer votre compte',
  'account.delete.toastFailed': 'Échec de la suppression du compte',
  'account.delete.toastSuccess': 'Compte supprimé avec succès',
  'account.delete.toastRetry': 'Échec de la suppression du compte. Réessayez.',
  'account.delete.dangerTitle': 'Cette action est irréversible',
  'account.delete.dangerBody':
    'La suppression de votre compte efface votre profil, votre planning d’équipes et les données de santé associées dans ShiftCoach.',
  'account.delete.typeDelete': 'Tapez DELETE pour confirmer',
  'account.delete.permanently': 'Supprimer définitivement mon compte',
  'account.delete.deleting': 'Suppression…',
  'account.delete.subtitleSignedIn':
    'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
  'account.delete.listHeading': 'Ce qui sera supprimé :',
  'account.delete.bulletSleep': 'Tous les journaux et données de sommeil',
  'account.delete.bulletRota': 'Tous les motifs d’équipes et le planning',
  'account.delete.bulletNutrition': 'Tous les journaux nutritionnels',
  'account.delete.bulletActivity': 'Toutes les données d’activité',
  'account.delete.bulletProfile': 'Votre profil et vos réglages',
  'account.delete.bulletCalendar': 'Tous les événements du calendrier',
  'account.delete.bulletBilling': 'Toutes les informations d’abonnement et de paiement',
  'account.delete.cancel': 'Annuler',
  'account.delete.confirm': 'Confirmer la suppression',
  'account.delete.placeholderDelete': 'Tapez DELETE',
  'account.delete.goHome': "Aller à l'accueil",
  'account.delete.footerNote': 'Vous pouvez aussi supprimer votre compte depuis les réglages de l’application.',
  'account.delete.footerWebRequest': 'Demande de suppression (web)',
  'account.delete.footerPrivacy': 'Voir la politique de confidentialité',

  'legal.privacy.title': 'Politique de confidentialité',
  'legal.privacy.lastUpdated': 'Dernière mise à jour : {date}',
  'legal.privacy.englishNote':
    'Le texte juridique ci-dessous est en anglais. Une traduction juridique relue pourra être ajoutée dans une mise à jour ultérieure.',

  'legal.terms.title': 'Conditions d’utilisation',
  'legal.terms.lastUpdated': 'Dernière mise à jour : {date}',
  'legal.terms.englishNote':
    'Le texte juridique ci-dessous est en anglais. Une traduction juridique relue pourra être ajoutée dans une mise à jour ultérieure.',

  'legal.healthNotice.title': 'Avis sur les données de santé',
  'legal.healthNotice.lastUpdated': 'Dernière mise à jour : {date}',
  'legal.healthNotice.englishNote':
    'L’avis ci-dessous est en anglais. Une traduction relue pourra être ajoutée dans une mise à jour ultérieure.',

  'shiftWorker.health.title': 'Santé des travailleurs postés',
  'shiftWorker.health.kicker': 'Repères',
  'shiftWorker.health.lede':
    'Contexte fondé sur les données sur le sommeil, les équipes et la récupération, adapté à votre planning.',
  'shiftWorker.health.readTime': 'Lecture 4 min',
  'shiftWorker.health.heroAlt':
    'Illustration de travailleurs postés et d’alimentation saine, alignée sur le carrousel du tableau de bord.',
  'shiftWorker.health.backAria': 'Retour au tableau de bord',
  'shiftWorker.health.p1':
    'Le travail posté ne change pas seulement vos horaires : il décale l’horloge biologique, les hormones et les besoins de récupération. Des journées longues et irrégulières et les nuits font que le cerveau et le corps restent « actifs » quand ils voudraient dormir.',
  'shiftWorker.health.p2':
    'ShiftCoach ajuste calories, objectifs de sommeil et de mouvement selon votre planning, votre âge, votre poids, votre taille et votre sexe, pour que les recommandations restent réalistes et protectrices, et pas seulement pensées pour un 9h–17h.',
  'shiftWorker.health.pillarsTitle': '3 piliers que nous suivons pour vous',
  'shiftWorker.health.pillar1Title': 'Sommeil et récupération :',
  'shiftWorker.health.pillar1Body':
    'combien vous dormez, quand, et l’ampleur de votre dette de sommeil.',
  'shiftWorker.health.pillar2Title': 'Motif d’équipes :',
  'shiftWorker.health.pillar2Body':
    'jour vs nuit vs rotation, l’exigence du poste et la fréquence des changements.',
  'shiftWorker.health.pillar3Title': 'Mouvement et activité :',
  'shiftWorker.health.pillar3Body':
    'pas, minutes actives et régularité du mouvement sur la semaine.',
  'shiftWorker.health.meaningTitle': 'Ce que cela signifie pour vous',
  'shiftWorker.health.meaning1':
    'Des objectifs calories et mouvement alignés sur la dureté réelle de vos équipes.',
  'shiftWorker.health.meaning2':
    'Des cibles de sommeil qui tiennent compte du travail de nuit et des jours de repos, pas seulement d’un bureau.',
  'shiftWorker.health.meaning3':
    'Des prochaines étapes simples quand le corps est surmené, sous-reposé, ou les deux.',
  'shiftWorker.health.footerTip':
    'Le tableau de bord se met à jour quand vous enregistrez sommeil et équipes ; ouvrez-le pour voir comment ces piliers s’appliquent à vous.',

  'shiftWorker.goals.title': 'Définir mes objectifs',
  'shiftWorker.goals.kicker': 'Planification',
  'shiftWorker.goals.lede':
    'Créez des cibles concrètes et des délais qui correspondent à vos équipes, votre sommeil et vos enjeux de santé.',
  'shiftWorker.goals.readTime': 'Lecture 5 min',
  'shiftWorker.goals.heroAlt':
    'Visuel objectifs et progression pour travailleurs postés, aligné sur le carrousel du tableau de bord.',
  'shiftWorker.goals.footerTip':
    'Revisitez ces objectifs depuis le tableau de bord et le profil quand votre planning change : de petits ajustements valent mieux qu’un plan « tout ou rien ».',
  'shiftWorker.goals.intro':
    'Les horaires décalés rendent difficiles les objectifs « parfaits » du manuel. Ici vous fixez des cibles et délais réalistes pour vos propres équipes, avec toujours quelque chose de clair à viser.',
  'shiftWorker.goals.sleepTitle': 'Objectifs sommeil et récupération',
  'shiftWorker.goals.sleepHint':
    'Servez-vous-en comme prompts et notez vos réponses dans vos notes ou votre plan.',
  'shiftWorker.goals.sleepLi1':
    'Objectif principal : ex. « Moyenne 7 h de sommeil en jour et 6,5 h sur les blocs de nuit d’ici 12 semaines. »',
  'shiftWorker.goals.sleepLi2':
    'Objectif court terme (2 semaines) : une étape simple comme « Ajouter 20 min de détente avant le coucher trois nuits par semaine. »',
  'shiftWorker.goals.sleepLi3':
    'Récupération après séries dures : une règle du type « Après chaque série de 3+ nuits je protège un jour complet de récupération avec au moins 8 h au lit. »',
  'shiftWorker.goals.activityTitle': 'Objectifs activité et poids',
  'shiftWorker.goals.activityLi1':
    'Pas : ex. « Atteindre 7 000 pas les jours travaillés et 9 000 les jours off pendant les 4 prochaines semaines. »',
  'shiftWorker.goals.activityLi2':
    'Force ou mouvement : choisissez 1–2 types (marche, étirements, salle) et liez-les au poste, ex. « 10 min de marche avant chaque fin de service tardive. »',
  'shiftWorker.goals.activityLi3':
    'Tendance de poids : plutôt qu’un régime extrême, une direction douce comme « Perdre 0,3–0,5 kg par semaine pendant 12 semaines » ou « Maintenir le poids mais réduire le tour de taille de 3 cm. »',
  'shiftWorker.goals.eatingTitle': 'Alimentation et envies en postés',
  'shiftWorker.goals.eatingLi1':
    'Règle nuit : ex. « Pas de gros repas chauds entre 1h et 5h — seulement des collations prévues. »',
  'shiftWorker.goals.eatingLi2':
    'Objectif fringale : changez un schéma, ex. « Pas de grignotage dans la voiture ou le canapé après les nuits pendant 30 jours. »',
  'shiftWorker.goals.eatingLi3':
    'Objectif préparation : préparer 1–2 repas ou collations riches en protéines avant chaque série de nuits pour que le distributeur soit le plan B, pas le plan A.',
  'shiftWorker.goals.timeTitle': 'Échéanciers qui fonctionnent en postés',
  'shiftWorker.goals.timeLi1':
    'Objectifs « une garde » : petites actions cochables aujourd’hui (marche avant le poste, un repas préparé, heure de coucher cible).',
  'shiftWorker.goals.timeLi2':
    'Objectifs 1 semaine : habitudes sur la semaine de planning, ex. « Noter le sommeil après chaque nuit » ou « 3 séances de mouvement même en semaine chargée. »',
  'shiftWorker.goals.timeLi3':
    'Objectifs 4–12 semaines : changements plus larges comme poids, énergie ou comment les vêtements vous vont.',
  'shiftWorker.goals.timeFooter':
    'Les plans les plus efficaces pour le travail posté sont flexibles mais précis : des cibles claires avec de la marge pour les séries difficiles. Ajustez après chaque planning plutôt que d’attendre le mois « parfait ».',

  'shiftWorker.diet.title': 'Alimentation en horaires décalés',
  'shiftWorker.diet.kicker': 'Repères nutritionnels',
  'shiftWorker.diet.lede':
    'Alimentation des travailleurs postés, problèmes de santé fréquents et comment le timing des repas vous protège.',
  'shiftWorker.diet.readTime': 'Lecture 6 min',
  'shiftWorker.diet.heroAlt':
    'Visuels repas sains et style de vie pour travailleurs postés, alignés sur le carrousel du tableau de bord.',
  'shiftWorker.diet.footerTip':
    'Enregistrez les repas et ouvrez les analyses nutrition dans ShiftCoach : elles restent alignées quand équipes et sommeil changent.',
  'shiftWorker.diet.whyTitle': 'Pourquoi l’alimentation est plus difficile en postés',
  'shiftWorker.diet.whyP1':
    'Les horaires décalés changent quand le cerveau pense qu’il fait « jour » ou « nuit ». La nuit, la digestion ralentit, le métabolisme baisse et les envies augmentent ; d’où l’attrait du gras et du sucré de nuit malgré la fatigue.',
  'shiftWorker.diet.whyP2':
    'Les règles classiques supposent un 9h–17h. ShiftCoach adapte votre plan à votre planning, sommeil, âge, sexe, poids et taille pour que calories et horaires collent à la vie réelle en équipes.',
  'shiftWorker.diet.issuesTitle': 'Problèmes de santé fréquents en postés',
  'shiftWorker.diet.issuesLi1':
    'Prise de poids et graisse abdominale : de gros repas la nuit favorisent le stockage et une dépense au repos plus faible.',
  'shiftWorker.diet.issuesLi2':
    'Glycémie en dents de scie : longues périodes sans manger puis repas énormes ou grignotage constant = envies et coups de pompe.',
  'shiftWorker.diet.issuesLi3':
    'Reflux et troubles digestifs : repas lourds près du sommeil sont plus durs quand l’estomac est en « mode nuit ».',
  'shiftWorker.diet.issuesLi4':
    'Risque accru de diabète et maladies cardiovasculaires : années de repas de nuit, manque de sommeil et stress tirent tension et sucre dans la mauvaise direction.',
  'shiftWorker.diet.issuesFooter':
    'Vous ne changez pas votre planning du jour au lendemain, mais le bon timing et les portions réduisent fortement ces risques.',
  'shiftWorker.diet.structureTitle': 'Structure de repas simple qui tient la route',
  'shiftWorker.diet.dayLabel': 'Pour les équipes de jour :',
  'shiftWorker.diet.dayLi1': 'Repas principal au milieu de la journée (pas tard le soir).',
  'shiftWorker.diet.dayLi2': 'Petit-déjeuner léger et dîner plus léger pour protéger le sommeil.',
  'shiftWorker.diet.dayLi3':
    'Visez 20–30 g de protéines à chaque repas principal pour rester rassasié.',
  'shiftWorker.diet.nightLabel': 'Pour les équipes de nuit :',
  'shiftWorker.diet.nightLi1': 'Prenez le repas le plus copieux 2–3 h avant le début de service.',
  'shiftWorker.diet.nightLi2':
    'Pendant la nuit, privilégiez de petites collations protéinées plutôt que de gros repas chauds.',
  'shiftWorker.diet.nightLi3':
    'Après la garde, petit-déjeuner léger puis sommeil — évitez un dîner très lourd « après nuit ».',
  'shiftWorker.diet.profileTitle': 'Comment ShiftCoach utilise votre profil',
  'shiftWorker.diet.profileLi1':
    'Âge, sexe, taille, poids : besoins caloriques de base et équilibre des macronutriments.',
  'shiftWorker.diet.profileLi2':
    'Planning et charge du poste : ajustent les calories à la hausse ou à la baisse quand les équipes sont plus dures ou en récupération.',
  'shiftWorker.diet.profileLi3':
    'Dette de sommeil et rythme : légère baisse calorique les semaines avec beaucoup de repas de nuit et peu de sommeil.',
  'shiftWorker.diet.profileFooter':
    'L’objectif n’est pas la perfection : rendre les choix sains plus faciles sur vos vraies équipes, pour que poids, énergie et santé à long terme aillent dans le bon sens sans régimes extrêmes.',

  'verifyOnboarding.title': 'Vérification de l’intégration',
  'verifyOnboarding.subtitle': 'Vérification des migrations et du flux d’intégration',
  'verifyOnboarding.loading': 'Exécution des vérifications…',
  'verifyOnboarding.runAgain': 'Relancer les vérifications',
  'verifyOnboarding.backDashboard': 'Retour au tableau de bord',
  'verifyOnboarding.back': 'Retour',
  'verifyOnboarding.viewDetails': 'Voir les détails',
  'verifyOnboarding.sectionMigration': 'Migration de la base de données',
  'verifyOnboarding.sectionProfile': 'Données du profil',
  'verifyOnboarding.sectionOnboarding': "Flux d'intégration",
  'verifyOnboarding.testOnboarding': 'Tester l’intégration',
  'verifyOnboarding.actionRequired': 'Action requise',
  'verifyOnboarding.migrationFailBody':
    'La migration de base de données n’a pas été exécutée. L’âge et la date de naissance ne seront pas enregistrés.',
  'verifyOnboarding.migrationStep1': 'Ouvrez le tableau de bord Supabase',
  'verifyOnboarding.migrationStep2': 'Allez dans l’éditeur SQL',
  'verifyOnboarding.migrationStep3': 'Copiez le contenu de :',
  'verifyOnboarding.migrationStep4': 'Collez et exécutez le SQL',
  'verifyOnboarding.migrationStep5': 'Revenez sur cette page pour vérifier',
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
