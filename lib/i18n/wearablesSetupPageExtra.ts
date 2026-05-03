/** Wearables setup page — Samsung Wear OS / closed-test steps and misc UI not in main provider bundle. */

export const wearablesSetupPageExtraEn: Record<string, string> = {
  'detail.wearablesSetup.samsungWearStep1':
    'Join the ShiftCoach closed test using the same Google account on phone and watch.',
  'detail.wearablesSetup.samsungWearStep2':
    'Install ShiftCoach on your phone from Play Store, then install ShiftCoach on your Wear OS watch from Play Store.',
  'detail.wearablesSetup.samsungWearStep3':
    'Open ShiftCoach on both phone and watch once, and keep Bluetooth enabled.',
  'detail.wearablesSetup.samsungWearStep4':
    'On Android, enable Health Connect and allow apps to share steps, sleep, and heart rate into Health Connect (Samsung Health, Google Fit where supported, and phone sensors).',
  'detail.wearablesSetup.samsungWearStep5':
    'In ShiftCoach mobile, check the watch status pill. It should show “Watch app connected”.',
  'detail.wearablesSetup.samsungWearStep6':
    'Tap “Sync wearables” to refresh steps, sleep, and heart-rate data.',
  'detail.wearablesSetup.samsungWearFooter':
    'If watch status is not connected, open ShiftCoach on the watch and return to this screen.',
  'detail.wearablesSetup.healthConnectAppleHealthCta': 'Use Health Connect / Apple Health',
  'detail.wearablesSetup.healthConnectAppleHealthTitle':
    'Use Health Connect on Android or Apple Health on iPhone. Google Fit onboarding is legacy-only.',
  'detail.wearablesSetup.legacyGoogleFitBanner':
    'Connected via legacy Google Fit. Android should migrate to Health Connect.',
  'detail.wearablesSetup.debugWearablesLink': 'Open wearables data health debug',
  'detail.wearablesSetup.pathsExplanation':
    'ShiftCoach does not read your watch, Samsung Health, or Google Fit directly. On Android it only reads what is already stored in Health Connect for Steps, Sleep, and Heart Rate.\n\nPath A — Galaxy Watch / Samsung Health:\nGalaxy Watch → Samsung Health on your phone → Health Connect → ShiftCoach\n\nPath B — Google Fit:\nGoogle Fit on your watch → Google Fit on your phone (same Google account) → Health Connect → ShiftCoach\n\nIf there are no recent entries in Health Connect for those types, ShiftCoach has nothing to sync yet.',
  'detail.wearablesSetup.troubleshootGoogleFitTitle': 'Data source troubleshooting (Google Fit)',
  'detail.wearablesSetup.troubleshootGoogleFitBody':
    'If Samsung Health is stuck loading, you can use Google Fit as a temporary source instead.\n\n1. Open Google Fit on your watch and on your phone using the same Google account.\n2. Record a short walk or a heart-rate reading on the watch.\n3. Check that it appears in Google Fit on your phone.\n4. On your phone: Android Settings → Health Connect → App permissions → Google Fit.\n5. Allow Fit to write or share Steps, Sleep (if available), and Heart Rate into Health Connect.\n6. Return to ShiftCoach and tap Sync now.\n\nShiftCoach only requests read access for Steps, Sleep, and Heart Rate—not calories, nutrition, or exercise sessions.',
  'detail.wearablesSetup.samsungHealthStuckTitle': 'If Samsung Health is stuck loading',
  'detail.wearablesSetup.samsungHealthStuckBody':
    'Try these steps on your phone:\n\n• Force stop Samsung Health (App info → Force stop).\n• Clear Samsung Health cache (App info → Storage → Clear cache).\n• Update Samsung Health from Galaxy Store or Google Play.\n• In Galaxy Wearable, confirm your watch is connected.\n• If it is still stuck, clear Samsung Health storage and sign in again (you may need to re-pair health data).\n\nShiftCoach can still work with Google Fit if Fit writes Steps, Sleep, and Heart Rate into Health Connect—use the Google Fit troubleshooting section above.',
  'detail.wearablesSetup.hcDataCheckTitle': 'Verify data in Health Connect',
  'detail.wearablesSetup.hcDataCheckBody':
    'Before assuming ShiftCoach is at fault, confirm Android has data to read:\n\nSettings → Health Connect → Data and access → Steps, Sleep, or Heart rate.\n\nOpen each type and check for recent entries and which apps are listed as sources.\n\nIf there are no recent entries in Health Connect, ShiftCoach has nothing to read yet—fix the writer app (Samsung Health or Google Fit) first, then sync again.',
  'detail.wearablesSetup.permissionHelpIntro':
    'Having trouble with wearables? Check Health Connect permissions on your phone (Steps, Sleep, Heart Rate):',
  'detail.wearablesSetup.helpLinkAppleLabel': 'iPhone: Motion & Fitness (Apple Support)',
  'detail.wearablesSetup.helpLinkAndroidLabel': 'Android: Health Connect (Google Help)',

  'detail.wearablesSync.syncWearables': 'Sync wearables',
  'detail.wearablesSync.syncing': 'Syncing…',
  'detail.wearablesSync.wearablesSynced': 'Wearables synced',
  'detail.wearablesSync.syncFailed': 'Sync failed',
  'detail.wearablesSync.buttonConnectHc': 'Connect Health Connect',
  'detail.wearablesSync.buttonSyncNow': 'Sync now',
  'detail.wearablesSync.helperConnectFlow':
    'Tap Connect — Android opens Health Connect and asks for Steps, Sleep, and Heart Rate. You can change this later in Health Connect settings.',
  'detail.wearablesSync.helperLinkedNative':
    'Health Connect is linked. Tap to sync the latest Steps, Sleep, and Heart Rate.',
  'detail.wearablesSync.helperDisconnectedWeb': 'Connect to Health Connect to sync Steps, Sleep, and Heart Rate.',
  'detail.wearablesSync.preSyncChecklistTitle': 'Before you tap Sync now',
  'detail.wearablesSync.preSyncChecklistBody':
    '• Your watch has recorded data today.\n• Google Fit or Samsung Health shows that data on your phone.\n• Google Fit or Samsung Health is allowed to write or share into Health Connect (App permissions).\n• Health Connect shows recent entries for Steps, Sleep, or Heart rate under Data and access.\n• Then tap Sync now in ShiftCoach.',
  'detail.wearablesSync.hcConnectedNoDataBody':
    'Health Connect is connected, but no recent Steps, Sleep, or Heart Rate data was found. Open Google Fit or Samsung Health and make sure it is writing data to Health Connect, then try Sync now again.',
  'detail.wearablesSync.sourceChainShort':
    'Samsung Health, Google Fit, or your watch must write Steps, Sleep, and Heart Rate into Health Connect. ShiftCoach only reads those types from Health Connect—not from the watch or vendor apps directly.',

  'detail.wearablesDebug.title': 'Wearables data health',
  'detail.wearablesDebug.backLink': 'Back to wearables setup',
  'detail.wearablesDebug.loading': 'Loading data health checks…',
  'detail.wearablesDebug.endpointErrors': 'Endpoint errors',
  'detail.wearablesDebug.sectionRawDb': 'Raw synced data (DB)',
  'detail.wearablesDebug.sectionActivityToday': 'Card API output: /api/activity/today',
  'detail.wearablesDebug.sectionSleepOverview': 'Card API output: /api/sleep/overview',
  'detail.wearablesDebug.sectionHeartRate': 'Card API output: /api/wearables/heart-rate',
}

export const wearablesSetupPageExtraEs: Record<string, string> = {
  'detail.wearablesSetup.samsungWearStep1':
    'Únete a la prueba cerrada de ShiftCoach con la misma cuenta de Google en móvil y reloj.',
  'detail.wearablesSetup.samsungWearStep2':
    'Instala ShiftCoach en el móvil desde Play Store y luego en el reloj Wear OS desde Play Store.',
  'detail.wearablesSetup.samsungWearStep3':
    'Abre ShiftCoach una vez en móvil y reloj y mantén el Bluetooth activado.',
  'detail.wearablesSetup.samsungWearStep4':
    'En Android, activa Health Connect y permite que las apps compartan pasos, sueño y frecuencia cardíaca en Health Connect (Samsung Health, Google Fit si aplica y sensores del móvil).',
  'detail.wearablesSetup.samsungWearStep5':
    'En ShiftCoach móvil, revisa el indicador del reloj. Debería mostrar «App del reloj conectada».',
  'detail.wearablesSetup.samsungWearStep6':
    'Pulsa «Sincronizar wearables» para actualizar pasos, sueño y frecuencia cardíaca.',
  'detail.wearablesSetup.samsungWearFooter':
    'Si el estado no está conectado, abre ShiftCoach en el reloj y vuelve a esta pantalla.',
  'detail.wearablesSetup.healthConnectAppleHealthCta': 'Usar Health Connect / Apple Health',
  'detail.wearablesSetup.healthConnectAppleHealthTitle':
    'Usa Health Connect en Android o Apple Health en iPhone. La configuración con Google Fit es solo heredada.',
  'detail.wearablesSetup.legacyGoogleFitBanner':
    'Conectado con Google Fit heredado. En Android conviene pasar a Health Connect.',
  'detail.wearablesSetup.debugWearablesLink': 'Abrir depuración de datos de wearables',
  'detail.wearablesSetup.pathsExplanation':
    'ShiftCoach no lee directamente tu reloj, Samsung Health ni Google Fit. En Android solo lee lo que ya está en Health Connect para Pasos, Sueño y Frecuencia cardíaca.\n\nRuta A — Galaxy Watch / Samsung Health:\nGalaxy Watch → Samsung Health en el móvil → Health Connect → ShiftCoach\n\nRuta B — Google Fit:\nGoogle Fit en el reloj → Google Fit en el móvil (misma cuenta de Google) → Health Connect → ShiftCoach\n\nSi no hay entradas recientes en Health Connect para esos tipos, ShiftCoach aún no tiene datos que sincronizar.',
  'detail.wearablesSetup.troubleshootGoogleFitTitle': 'Solución de datos (Google Fit)',
  'detail.wearablesSetup.troubleshootGoogleFitBody':
    'Si Samsung Health se queda cargando, puedes usar Google Fit como fuente temporal.\n\n1. Abre Google Fit en el reloj y en el móvil con la misma cuenta de Google.\n2. Registra una caminata corta o una lectura de frecuencia cardíaca en el reloj.\n3. Comprueba que aparece en Google Fit en el móvil.\n4. En el móvil: Ajustes de Android → Health Connect → Permisos de apps → Google Fit.\n5. Permite que Fit escriba o comparta Pasos, Sueño (si está disponible) y Frecuencia cardíaca hacia Health Connect.\n6. Vuelve a ShiftCoach y pulsa Sincronizar ahora.\n\nShiftCoach solo pide lectura de Pasos, Sueño y Frecuencia cardíaca: no calorías, nutrición ni sesiones de ejercicio.',
  'detail.wearablesSetup.samsungHealthStuckTitle': 'Si Samsung Health se queda cargando',
  'detail.wearablesSetup.samsungHealthStuckBody':
    'Prueba en el móvil:\n\n• Forzar detención de Samsung Health (Información de la app → Forzar detención).\n• Borrar caché (Información de la app → Almacenamiento → Borrar caché).\n• Actualizar Samsung Health desde Galaxy Store o Play Store.\n• En Galaxy Wearable, confirma que el reloj está conectado.\n• Si sigue fallando, borra datos de Samsung Health y vuelve a iniciar sesión (puede requerir emparejar de nuevo datos de salud).\n\nShiftCoach puede seguir funcionando con Google Fit si Fit escribe Pasos, Sueño y Frecuencia cardíaca en Health Connect: usa la sección de Google Fit arriba.',
  'detail.wearablesSetup.hcDataCheckTitle': 'Comprueba Health Connect',
  'detail.wearablesSetup.hcDataCheckBody':
    'Antes de culpar a ShiftCoach, confirma que Android tiene datos:\n\nAjustes → Health Connect → Datos y acceso → Pasos, Sueño o Frecuencia cardíaca.\n\nAbre cada tipo y revisa entradas recientes y qué apps aparecen como fuente.\n\nSi no hay entradas recientes en Health Connect, ShiftCoach no tiene nada que leer: arregla primero la app que escribe (Samsung Health o Google Fit) y luego sincroniza de nuevo.',
  'detail.wearablesSetup.permissionHelpIntro':
    '¿Problemas con wearables? Revisa los permisos de Health Connect (Pasos, Sueño, Frecuencia cardíaca):',
  'detail.wearablesSetup.helpLinkAppleLabel': 'iPhone: Movimiento y fitness (soporte Apple)',
  'detail.wearablesSetup.helpLinkAndroidLabel': 'Android: Health Connect (ayuda de Google)',

  'detail.wearablesSync.syncWearables': 'Sincronizar wearables',
  'detail.wearablesSync.syncing': 'Sincronizando…',
  'detail.wearablesSync.wearablesSynced': 'Wearables sincronizados',
  'detail.wearablesSync.syncFailed': 'Error al sincronizar',
  'detail.wearablesSync.buttonConnectHc': 'Conectar Health Connect',
  'detail.wearablesSync.buttonSyncNow': 'Sincronizar ahora',
  'detail.wearablesSync.helperConnectFlow':
    'Pulsa Conectar: Android abre Health Connect y pide Pasos, Sueño y Frecuencia cardíaca. Puedes cambiarlo luego en los ajustes de Health Connect.',
  'detail.wearablesSync.helperLinkedNative':
    'Health Connect está vinculado. Toca para sincronizar los últimos Pasos, Sueño y Frecuencia cardíaca.',
  'detail.wearablesSync.helperDisconnectedWeb': 'Conecta Health Connect para sincronizar Pasos, Sueño y Frecuencia cardíaca.',
  'detail.wearablesSync.preSyncChecklistTitle': 'Antes de pulsar Sincronizar ahora',
  'detail.wearablesSync.preSyncChecklistBody':
    '• Tu reloj ha registrado datos hoy.\n• Google Fit o Samsung Health muestra esos datos en el móvil.\n• Google Fit o Samsung Health puede escribir o compartir en Health Connect (permisos de apps).\n• Health Connect muestra entradas recientes de Pasos, Sueño o Frecuencia cardíaca en Datos y acceso.\n• Luego pulsa Sincronizar ahora en ShiftCoach.',
  'detail.wearablesSync.hcConnectedNoDataBody':
    'Health Connect está conectado, pero no se encontraron datos recientes de Pasos, Sueño ni Frecuencia cardíaca. Abre Google Fit o Samsung Health y asegúrate de que escriben datos en Health Connect, luego vuelve a pulsar Sincronizar ahora.',
  'detail.wearablesSync.sourceChainShort':
    'Samsung Health, Google Fit o tu reloj deben escribir Pasos, Sueño y Frecuencia cardíaca en Health Connect. ShiftCoach solo lee esos tipos desde Health Connect, no directamente desde el reloj ni las apps del fabricante.',

  'detail.wearablesDebug.title': 'Salud de datos de wearables',
  'detail.wearablesDebug.backLink': 'Volver a configuración de wearables',
  'detail.wearablesDebug.loading': 'Cargando comprobaciones de datos…',
  'detail.wearablesDebug.endpointErrors': 'Errores de endpoints',
  'detail.wearablesDebug.sectionRawDb': 'Datos sincronizados en bruto (BD)',
  'detail.wearablesDebug.sectionActivityToday': 'Salida API tarjeta: /api/activity/today',
  'detail.wearablesDebug.sectionSleepOverview': 'Salida API tarjeta: /api/sleep/overview',
  'detail.wearablesDebug.sectionHeartRate': 'Salida API tarjeta: /api/wearables/heart-rate',
}

export const wearablesSetupPageExtraDe: Record<string, string> = {
  'detail.wearablesSetup.samsungWearStep1':
    'Nimm am ShiftCoach-Closed-Test teil – dasselbe Google-Konto auf Handy und Uhr.',
  'detail.wearablesSetup.samsungWearStep2':
    'Installiere ShiftCoach auf dem Handy aus dem Play Store, dann auf der Wear-OS-Uhr aus dem Play Store.',
  'detail.wearablesSetup.samsungWearStep3':
    'Öffne ShiftCoach einmal auf Handy und Uhr und lasse Bluetooth aktiviert.',
  'detail.wearablesSetup.samsungWearStep4':
    'Aktiviere auf Android Health Connect und erlaube Apps die Freigabe für Schritte, Schlaf und Herzfrequenz in Health Connect (Samsung Health, ggf. Google Fit und Handy-Sensoren).',
  'detail.wearablesSetup.samsungWearStep5':
    'In der ShiftCoach-App prüfe den Uhren-Status. Er sollte „Watch-App verbunden“ anzeigen.',
  'detail.wearablesSetup.samsungWearStep6':
    'Tippe auf „Wearables synchronisieren“, um Schritte, Schlaf und Herzfrequenz zu aktualisieren.',
  'detail.wearablesSetup.samsungWearFooter':
    'Wenn nicht verbunden: ShiftCoach auf der Uhr öffnen und zu diesem Bildschirm zurückkehren.',
  'detail.wearablesSetup.healthConnectAppleHealthCta': 'Health Connect / Apple Health nutzen',
  'detail.wearablesSetup.healthConnectAppleHealthTitle':
    'Nutze Health Connect auf Android oder Apple Health auf dem iPhone. Google-Fit-Onboarding ist nur Legacy.',
  'detail.wearablesSetup.legacyGoogleFitBanner':
    'Verbunden über älteres Google Fit. Auf Android solltest du zu Health Connect wechseln.',
  'detail.wearablesSetup.debugWearablesLink': 'Wearables-Daten-Debug öffnen',
  'detail.wearablesSetup.pathsExplanation':
    'ShiftCoach liest weder Uhr, Samsung Health noch Google Fit direkt. Auf Android nutzt es nur Daten, die bereits in Health Connect für Schritte, Schlaf und Herzfrequenz liegen.\n\nPfad A — Galaxy Watch / Samsung Health:\nGalaxy Watch → Samsung Health auf dem Handy → Health Connect → ShiftCoach\n\nPfad B — Google Fit:\nGoogle Fit auf der Uhr → Google Fit auf dem Handy (selbes Google-Konto) → Health Connect → ShiftCoach\n\nOhne aktuelle Einträge in Health Connect für diese Typen gibt es für ShiftCoach noch nichts zu synchronisieren.',
  'detail.wearablesSetup.troubleshootGoogleFitTitle': 'Datenquelle reparieren (Google Fit)',
  'detail.wearablesSetup.troubleshootGoogleFitBody':
    'Wenn Samsung Health endlos lädt, kannst du vorübergehend Google Fit nutzen.\n\n1. Öffne Google Fit auf Uhr und Handy mit demselben Google-Konto.\n2. Geh kurz laufen oder miss die Herzfrequenz auf der Uhr.\n3. Prüfe, dass es in Google Fit auf dem Handy erscheint.\n4. Auf dem Handy: Android-Einstellungen → Health Connect → App-Berechtigungen → Google Fit.\n5. Erlaube Fit, Schritte, Schlaf (falls verfügbar) und Herzfrequenz nach Health Connect zu schreiben oder zu teilen.\n6. Zurück in ShiftCoach: Jetzt synchronisieren tippen.\n\nShiftCoach fragt nur Lesen für Schritte, Schlaf und Herzfrequenz an—nicht Kalorien, Ernährung oder Trainingseinheiten.',
  'detail.wearablesSetup.samsungHealthStuckTitle': 'Wenn Samsung Health hängen bleibt',
  'detail.wearablesSetup.samsungHealthStuckBody':
    'Auf dem Handy nacheinander:\n\n• Samsung Health beenden erzwingen (App-Info → Beenden erzwingen).\n• Cache leeren (App-Info → Speicher → Cache leeren).\n• Samsung Health im Galaxy Store oder Play Store aktualisieren.\n• In Galaxy Wearable prüfen, ob die Uhr verbunden ist.\n• Wenn es weiter hängt: Speicher/Daten von Samsung Health leeren und neu anmelden (ggf. Daten neu koppeln).\n\nShiftCoach funktioniert weiter mit Google Fit, wenn Fit Schritte, Schlaf und Herzfrequenz in Health Connect schreibt—siehe Abschnitt Google Fit oben.',
  'detail.wearablesSetup.hcDataCheckTitle': 'Daten in Health Connect prüfen',
  'detail.wearablesSetup.hcDataCheckBody':
    'Bevor du ShiftCoach die Schuld gibst, prüfe Android:\n\nEinstellungen → Health Connect → Daten und Zugriff → Schritte, Schlaf oder Herzfrequenz.\n\nÖffne jeden Typ und prüfe letzte Einträge und Datenquellen.\n\nOhne aktuelle Einträge in Health Connect hat ShiftCoach nichts zu lesen—zuerst die schreibende App (Samsung Health oder Google Fit) reparieren, dann erneut synchronisieren.',
  'detail.wearablesSetup.permissionHelpIntro':
    'Probleme mit Wearables? Prüfe Health-Connect-Berechtigungen (Schritte, Schlaf, Herzfrequenz) auf dem Handy:',
  'detail.wearablesSetup.helpLinkAppleLabel': 'iPhone: Bewegung & Fitness (Apple Support)',
  'detail.wearablesSetup.helpLinkAndroidLabel': 'Android: Health Connect (Google-Hilfe)',

  'detail.wearablesSync.syncWearables': 'Wearables synchronisieren',
  'detail.wearablesSync.syncing': 'Wird synchronisiert…',
  'detail.wearablesSync.wearablesSynced': 'Wearables synchronisiert',
  'detail.wearablesSync.syncFailed': 'Sync fehlgeschlagen',
  'detail.wearablesSync.buttonConnectHc': 'Health Connect verbinden',
  'detail.wearablesSync.buttonSyncNow': 'Jetzt synchronisieren',
  'detail.wearablesSync.helperConnectFlow':
    'Tippe auf Verbinden — Android öffnet Health Connect und fragt nach Schritten, Schlaf und Herzfrequenz. Später in den Health-Connect-Einstellungen änderbar.',
  'detail.wearablesSync.helperLinkedNative':
    'Health Connect ist verknüpft. Tippen, um die neuesten Schritte, Schlaf und Herzfrequenz zu synchronisieren.',
  'detail.wearablesSync.helperDisconnectedWeb':
    'Mit Health Connect verbinden, um Schritte, Schlaf und Herzfrequenz zu synchronisieren.',
  'detail.wearablesSync.preSyncChecklistTitle': 'Bevor du „Jetzt synchronisieren“ tippst',
  'detail.wearablesSync.preSyncChecklistBody':
    '• Die Uhr hat heute Daten aufgezeichnet.\n• Google Fit oder Samsung Health zeigt diese Daten auf dem Handy.\n• Google Fit oder Samsung Health darf in Health Connect schreiben/teilen (App-Berechtigungen).\n• Health Connect zeigt unter „Daten und Zugriff“ aktuelle Einträge für Schritte, Schlaf oder Herzfrequenz.\n• Dann in ShiftCoach „Jetzt synchronisieren“ tippen.',
  'detail.wearablesSync.hcConnectedNoDataBody':
    'Health Connect ist verbunden, aber es wurden keine aktuellen Daten zu Schritten, Schlaf oder Herzfrequenz gefunden. Öffne Google Fit oder Samsung Health und stelle sicher, dass Daten nach Health Connect geschrieben werden, tippe dann erneut auf Jetzt synchronisieren.',
  'detail.wearablesSync.sourceChainShort':
    'Samsung Health, Google Fit oder deine Uhr müssen Schritte, Schlaf und Herzfrequenz in Health Connect schreiben. ShiftCoach liest nur diese Typen aus Health Connect—nicht direkt von Uhr oder Hersteller-Apps.',

  'detail.wearablesDebug.title': 'Wearables-Datengesundheit',
  'detail.wearablesDebug.backLink': 'Zurück zur Wearable-Einrichtung',
  'detail.wearablesDebug.loading': 'Datenprüfungen werden geladen…',
  'detail.wearablesDebug.endpointErrors': 'Endpunkt-Fehler',
  'detail.wearablesDebug.sectionRawDb': 'Rohdaten nach Sync (DB)',
  'detail.wearablesDebug.sectionActivityToday': 'Karten-API: /api/activity/today',
  'detail.wearablesDebug.sectionSleepOverview': 'Karten-API: /api/sleep/overview',
  'detail.wearablesDebug.sectionHeartRate': 'Karten-API: /api/wearables/heart-rate',
}

export const wearablesSetupPageExtraFr: Record<string, string> = {
  'detail.wearablesSetup.samsungWearStep1':
    'Rejoignez le test fermé ShiftCoach avec le même compte Google sur téléphone et montre.',
  'detail.wearablesSetup.samsungWearStep2':
    'Installez ShiftCoach sur le téléphone depuis le Play Store, puis sur la montre Wear OS depuis le Play Store.',
  'detail.wearablesSetup.samsungWearStep3':
    'Ouvrez ShiftCoach une fois sur les deux appareils et gardez le Bluetooth activé.',
  'detail.wearablesSetup.samsungWearStep4':
    'Sur Android, activez Health Connect et autorisez le partage des pas, du sommeil et de la fréquence cardiaque dans Health Connect (Samsung Health, Google Fit le cas échéant, capteurs du téléphone).',
  'detail.wearablesSetup.samsungWearStep5':
    'Dans ShiftCoach mobile, vérifiez le pastille montre : elle doit afficher « Appli montre connectée ».',
  'detail.wearablesSetup.samsungWearStep6':
    'Appuyez sur « Synchroniser les wearables » pour actualiser pas, sommeil et fréquence cardiaque.',
  'detail.wearablesSetup.samsungWearFooter':
    'Si non connecté, ouvrez ShiftCoach sur la montre puis revenez à cet écran.',
  'detail.wearablesSetup.healthConnectAppleHealthCta': 'Utiliser Health Connect / Apple Santé',
  'detail.wearablesSetup.healthConnectAppleHealthTitle':
    'Utilisez Health Connect sur Android ou Apple Santé sur iPhone. Google Fit est un ancien flux.',
  'detail.wearablesSetup.legacyGoogleFitBanner':
    'Connecté via l’ancien Google Fit. Sur Android, migrez vers Health Connect.',
  'detail.wearablesSetup.debugWearablesLink': 'Ouvrir le débogage données wearables',
  'detail.wearablesSetup.pathsExplanation':
    "ShiftCoach ne lit pas directement votre montre, Samsung Health ou Google Fit. Sur Android, il lit seulement ce qui est déjà dans Health Connect pour les pas, le sommeil et la fréquence cardiaque.\n\nVoie A — Galaxy Watch / Samsung Health :\nGalaxy Watch → Samsung Health sur le téléphone → Health Connect → ShiftCoach\n\nVoie B — Google Fit :\nGoogle Fit sur la montre → Google Fit sur le téléphone (même compte Google) → Health Connect → ShiftCoach\n\nSans entrées récentes dans Health Connect pour ces types, ShiftCoach n'a rien à synchroniser pour l'instant.",
  'detail.wearablesSetup.troubleshootGoogleFitTitle': 'Dépannage source de données (Google Fit)',
  'detail.wearablesSetup.troubleshootGoogleFitBody':
    "Si Samsung Health reste bloqué au chargement, utilisez temporairement Google Fit.\n\n1. Ouvrez Google Fit sur la montre et le téléphone avec le même compte Google.\n2. Enregistrez une courte marche ou une mesure de fréquence cardiaque sur la montre.\n3. Vérifiez qu'elle apparaît dans Google Fit sur le téléphone.\n4. Sur le téléphone : Réglages Android → Health Connect → Autorisations d'application → Google Fit.\n5. Autorisez Fit à écrire ou partager pas, sommeil (si disponible) et fréquence cardiaque vers Health Connect.\n6. Revenez dans ShiftCoach et appuyez sur Synchroniser maintenant.\n\nShiftCoach ne demande que la lecture des pas, du sommeil et de la fréquence cardiaque—pas calories, nutrition ni séances d'entraînement.",
  'detail.wearablesSetup.samsungHealthStuckTitle': 'Si Samsung Health reste bloqué',
  'detail.wearablesSetup.samsungHealthStuckBody':
    "Sur le téléphone :\n\n• Forcer l'arrêt de Samsung Health (Infos appli → Forcer l'arrêt).\n• Vider le cache (Infos appli → Stockage → Vider le cache).\n• Mettre à jour Samsung Health (Galaxy Store ou Play Store).\n• Dans Galaxy Wearable, vérifiez que la montre est connectée.\n• Si ça bloque encore, effacez les données de Samsung Health et reconnectez-vous.\n\nShiftCoach peut fonctionner avec Google Fit si Fit écrit pas, sommeil et fréquence cardiaque dans Health Connect—voir la section Google Fit ci-dessus.",
  'detail.wearablesSetup.hcDataCheckTitle': 'Vérifier les données dans Health Connect',
  'detail.wearablesSetup.hcDataCheckBody':
    "Avant d'incriminer ShiftCoach, vérifiez qu'Android a des données :\n\nRéglages → Health Connect → Données et accès → Pas, Sommeil ou Fréquence cardiaque.\n\nOuvrez chaque type et contrôlez les entrées récentes et les sources.\n\nSans entrées récentes dans Health Connect, ShiftCoach n'a rien à lire—corrigez d'abord l'application source (Samsung Health ou Google Fit), puis resynchronisez.",
  'detail.wearablesSetup.permissionHelpIntro':
    'Problème avec les wearables ? Vérifiez les autorisations Health Connect (pas, sommeil, fréquence cardiaque) :',
  'detail.wearablesSetup.helpLinkAppleLabel': 'iPhone : Mouvement et forme (assistance Apple)',
  'detail.wearablesSetup.helpLinkAndroidLabel': 'Android : Health Connect (aide Google)',

  'detail.wearablesSync.syncWearables': 'Synchroniser les wearables',
  'detail.wearablesSync.syncing': 'Synchronisation…',
  'detail.wearablesSync.wearablesSynced': 'Wearables synchronisés',
  'detail.wearablesSync.syncFailed': 'Échec de la synchronisation',
  'detail.wearablesSync.buttonConnectHc': 'Connecter Health Connect',
  'detail.wearablesSync.buttonSyncNow': 'Synchroniser maintenant',
  'detail.wearablesSync.helperConnectFlow':
    'Appuyez sur Connecter — Android ouvre Health Connect et demande pas, sommeil et fréquence cardiaque. Modifiable ensuite dans les réglages Health Connect.',
  'detail.wearablesSync.helperLinkedNative':
    'Health Connect est lié. Appuyez pour synchroniser les derniers pas, sommeil et fréquence cardiaque.',
  'detail.wearablesSync.helperDisconnectedWeb':
    'Connectez Health Connect pour synchroniser pas, sommeil et fréquence cardiaque.',
  'detail.wearablesSync.preSyncChecklistTitle': 'Avant d’appuyer sur Synchroniser maintenant',
  'detail.wearablesSync.preSyncChecklistBody':
    "• La montre a enregistré des données aujourd'hui.\n• Google Fit ou Samsung Health affiche ces données sur le téléphone.\n• Google Fit ou Samsung Health est autorisé à écrire/partager vers Health Connect.\n• Health Connect montre des entrées récentes (pas, sommeil, fréquence cardiaque) sous Données et accès.\n• Puis appuyez sur Synchroniser maintenant dans ShiftCoach.",
  'detail.wearablesSync.hcConnectedNoDataBody':
    "Health Connect est connecté, mais aucune donnée récente de pas, sommeil ou fréquence cardiaque n'a été trouvée. Ouvrez Google Fit ou Samsung Health et assurez-vous qu'ils écrivent vers Health Connect, puis réessayez Synchroniser maintenant.",
  'detail.wearablesSync.sourceChainShort':
    "Samsung Health, Google Fit ou votre montre doivent écrire pas, sommeil et fréquence cardiaque dans Health Connect. ShiftCoach lit uniquement ces types depuis Health Connect—pas directement depuis la montre ou les applis constructeur.",

  'detail.wearablesDebug.title': 'Santé des données wearables',
  'detail.wearablesDebug.backLink': 'Retour à la configuration wearables',
  'detail.wearablesDebug.loading': 'Chargement des vérifications…',
  'detail.wearablesDebug.endpointErrors': 'Erreurs de points d’accès',
  'detail.wearablesDebug.sectionRawDb': 'Données brutes synchronisées (BD)',
  'detail.wearablesDebug.sectionActivityToday': 'Sortie API carte : /api/activity/today',
  'detail.wearablesDebug.sectionSleepOverview': 'Sortie API carte : /api/sleep/overview',
  'detail.wearablesDebug.sectionHeartRate': 'Sortie API carte : /api/wearables/heart-rate',
}

export const wearablesSetupPageExtraPtBR: Record<string, string> = {
  'detail.wearablesSetup.samsungWearStep1':
    'Entre no teste fechado do ShiftCoach com a mesma conta Google no celular e no relógio.',
  'detail.wearablesSetup.samsungWearStep2':
    'Instale o ShiftCoach no celular pela Play Store e depois no relógio Wear OS pela Play Store.',
  'detail.wearablesSetup.samsungWearStep3':
    'Abra o ShiftCoach uma vez no celular e no relógio e mantenha o Bluetooth ligado.',
  'detail.wearablesSetup.samsungWearStep4':
    'No Android, ative o Health Connect e permita que apps compartilhem passos, sono e frequência cardíaca no Health Connect (Samsung Health, Google Fit quando aplicável, sensores do celular).',
  'detail.wearablesSetup.samsungWearStep5':
    'No ShiftCoach no celular, confira o indicador do relógio. Deve mostrar “App do relógio conectada”.',
  'detail.wearablesSetup.samsungWearStep6':
    'Toque em “Sincronizar wearables” para atualizar passos, sono e frequência cardíaca.',
  'detail.wearablesSetup.samsungWearFooter':
    'Se não estiver conectado, abra o ShiftCoach no relógio e volte a esta tela.',
  'detail.wearablesSetup.healthConnectAppleHealthCta': 'Usar Health Connect / Apple Health',
  'detail.wearablesSetup.healthConnectAppleHealthTitle':
    'Use o Health Connect no Android ou o Apple Health no iPhone. O fluxo do Google Fit é legado.',
  'detail.wearablesSetup.legacyGoogleFitBanner':
    'Conectado pelo Google Fit legado. No Android, migre para o Health Connect.',
  'detail.wearablesSetup.debugWearablesLink': 'Abrir depuração de dados de wearables',
  'detail.wearablesSetup.pathsExplanation':
    'O ShiftCoach não lê diretamente o relógio, Samsung Health nem Google Fit. No Android, ele só lê o que já está no Health Connect para Passos, Sono e Frequência cardíaca.\n\nCaminho A — Galaxy Watch / Samsung Health:\nGalaxy Watch → Samsung Health no celular → Health Connect → ShiftCoach\n\nCaminho B — Google Fit:\nGoogle Fit no relógio → Google Fit no celular (mesma conta Google) → Health Connect → ShiftCoach\n\nSem entradas recentes no Health Connect para esses tipos, o ShiftCoach ainda não tem dados para sincronizar.',
  'detail.wearablesSetup.troubleshootGoogleFitTitle': 'Solução de fonte de dados (Google Fit)',
  'detail.wearablesSetup.troubleshootGoogleFitBody':
    'Se o Samsung Health ficar carregando, use o Google Fit como fonte temporária.\n\n1. Abra o Google Fit no relógio e no celular com a mesma conta Google.\n2. Registre uma caminhada curta ou uma leitura de frequência cardíaca no relógio.\n3. Confira se aparece no Google Fit no celular.\n4. No celular: Ajustes do Android → Health Connect → Permissões de apps → Google Fit.\n5. Permita que o Fit escreva ou compartilhe Passos, Sono (se disponível) e Frequência cardíaca no Health Connect.\n6. Volte ao ShiftCoach e toque em Sincronizar agora.\n\nO ShiftCoach só pede leitura de Passos, Sono e Frequência cardíaca — não calorias, nutrição nem sessões de treino.',
  'detail.wearablesSetup.samsungHealthStuckTitle': 'Se o Samsung Health ficar carregando',
  'detail.wearablesSetup.samsungHealthStuckBody':
    'No celular:\n\n• Force a parada do Samsung Health (Informações do app → Forçar parada).\n• Limpe o cache (Informações do app → Armazenamento → Limpar cache).\n• Atualize o Samsung Health na Galaxy Store ou Play Store.\n• No Galaxy Wearable, confirme que o relógio está conectado.\n• Se ainda travar, apague os dados do Samsung Health e entre de novo.\n\nO ShiftCoach pode funcionar com o Google Fit se o Fit gravar Passos, Sono e Frequência cardíaca no Health Connect — veja a seção do Google Fit acima.',
  'detail.wearablesSetup.hcDataCheckTitle': 'Verifique dados no Health Connect',
  'detail.wearablesSetup.hcDataCheckBody':
    'Antes de culpar o ShiftCoach, confira se o Android tem dados:\n\nAjustes → Health Connect → Dados e acesso → Passos, Sono ou Frequência cardíaca.\n\nAbra cada tipo e veja entradas recentes e fontes.\n\nSem entradas recentes no Health Connect, o ShiftCoach não tem o que ler — corrija primeiro o app que grava (Samsung Health ou Google Fit) e sincronize de novo.',
  'detail.wearablesSetup.permissionHelpIntro':
    'Problemas com wearables? Verifique as permissões do Health Connect (Passos, Sono, Frequência cardíaca):',
  'detail.wearablesSetup.helpLinkAppleLabel': 'iPhone: Movimento e condicionamento físico (suporte Apple)',
  'detail.wearablesSetup.helpLinkAndroidLabel': 'Android: Health Connect (ajuda Google)',

  'detail.wearablesSync.syncWearables': 'Sincronizar wearables',
  'detail.wearablesSync.syncing': 'Sincronizando…',
  'detail.wearablesSync.wearablesSynced': 'Wearables sincronizados',
  'detail.wearablesSync.syncFailed': 'Falha na sincronização',
  'detail.wearablesSync.buttonConnectHc': 'Conectar Health Connect',
  'detail.wearablesSync.buttonSyncNow': 'Sincronizar agora',
  'detail.wearablesSync.helperConnectFlow':
    'Toque em Conectar — o Android abre o Health Connect e pede Passos, Sono e Frequência cardíaca. Você pode mudar depois nas configurações do Health Connect.',
  'detail.wearablesSync.helperLinkedNative':
    'O Health Connect está vinculado. Toque para sincronizar os últimos Passos, Sono e Frequência cardíaca.',
  'detail.wearablesSync.helperDisconnectedWeb':
    'Conecte-se ao Health Connect para sincronizar Passos, Sono e Frequência cardíaca.',
  'detail.wearablesSync.preSyncChecklistTitle': 'Antes de tocar em Sincronizar agora',
  'detail.wearablesSync.preSyncChecklistBody':
    '• Seu relógio registrou dados hoje.\n• O Google Fit ou Samsung Health mostra esses dados no celular.\n• O Google Fit ou Samsung Health pode gravar ou compartilhar no Health Connect (permissões de apps).\n• O Health Connect mostra entradas recentes de Passos, Sono ou Frequência cardíaca em Dados e acesso.\n• Depois toque em Sincronizar agora no ShiftCoach.',
  'detail.wearablesSync.hcConnectedNoDataBody':
    'O Health Connect está conectado, mas não foram encontrados dados recentes de Passos, Sono ou Frequência cardíaca. Abra o Google Fit ou Samsung Health e confirme que estão gravando no Health Connect, depois toque em Sincronizar agora de novo.',
  'detail.wearablesSync.sourceChainShort':
    'Samsung Health, Google Fit ou seu relógio precisam gravar Passos, Sono e Frequência cardíaca no Health Connect. O ShiftCoach só lê esses tipos do Health Connect — não diretamente do relógio ou dos apps do fabricante.',

  'detail.wearablesDebug.title': 'Saúde dos dados de wearables',
  'detail.wearablesDebug.backLink': 'Voltar à configuração de wearables',
  'detail.wearablesDebug.loading': 'Carregando verificações de dados…',
  'detail.wearablesDebug.endpointErrors': 'Erros de endpoints',
  'detail.wearablesDebug.sectionRawDb': 'Dados brutos sincronizados (BD)',
  'detail.wearablesDebug.sectionActivityToday': 'Saída da API do cartão: /api/activity/today',
  'detail.wearablesDebug.sectionSleepOverview': 'Saída da API do cartão: /api/sleep/overview',
  'detail.wearablesDebug.sectionHeartRate': 'Saída da API do cartão: /api/wearables/heart-rate',
}

export const wearablesSetupPageExtraPl: Record<string, string> = {
  'detail.wearablesSetup.samsungWearStep1':
    'Dołącz do zamkniętych testów ShiftCoach z tym samym kontem Google w telefonie i na zegarku.',
  'detail.wearablesSetup.samsungWearStep2':
    'Zainstaluj ShiftCoach w telefonie ze Sklepu Play, potem na zegarku Wear OS ze Sklepu Play.',
  'detail.wearablesSetup.samsungWearStep3':
    'Otwórz ShiftCoach raz na telefonie i zegarku i zostaw włączony Bluetooth.',
  'detail.wearablesSetup.samsungWearStep4':
    'Na Androidzie włącz Health Connect i zezwól aplikacjom udostępniać w Health Connect kroki, sen i tętno (Samsung Health, Google Fit jeśli dotyczy, czujniki telefonu).',
  'detail.wearablesSetup.samsungWearStep5':
    'W aplikacji ShiftCoach sprawdź status zegarka — powinno być „Aplikacja zegarka połączona”.',
  'detail.wearablesSetup.samsungWearStep6':
    'Dotknij „Synchronizuj wearables”, aby odświeżyć kroki, sen i tętno.',
  'detail.wearablesSetup.samsungWearFooter':
    'Jeśli brak połączenia, otwórz ShiftCoach na zegarku i wróć do tego ekranu.',
  'detail.wearablesSetup.healthConnectAppleHealthCta': 'Użyj Health Connect / Apple Health',
  'detail.wearablesSetup.healthConnectAppleHealthTitle':
    'Na Androidzie użyj Health Connect, na iPhonie Apple Health. Konfiguracja Google Fit jest przestarzała.',
  'detail.wearablesSetup.legacyGoogleFitBanner':
    'Połączenie przez starsze Google Fit. Na Androidzie warto przejść na Health Connect.',
  'detail.wearablesSetup.debugWearablesLink': 'Otwórz debug danych wearables',
  'detail.wearablesSetup.pathsExplanation':
    'ShiftCoach nie czyta bezpośrednio zegarka, Samsung Health ani Google Fit. Na Androidzie korzysta tylko z danych już zapisanych w Health Connect: kroki, sen i tętno.\n\nŚcieżka A — Galaxy Watch / Samsung Health:\nGalaxy Watch → Samsung Health w telefonie → Health Connect → ShiftCoach\n\nŚcieżka B — Google Fit:\nGoogle Fit na zegarku → Google Fit w telefonie (to samo konto Google) → Health Connect → ShiftCoach\n\nBez świeżych wpisów w Health Connect dla tych typów ShiftCoach nie ma jeszcze czego synchronizować.',
  'detail.wearablesSetup.troubleshootGoogleFitTitle': 'Naprawa źródła danych (Google Fit)',
  'detail.wearablesSetup.troubleshootGoogleFitBody':
    'Gdy Samsung Health wisi na ładowaniu, możesz tymczasowo użyć Google Fit.\n\n1. Otwórz Google Fit na zegarku i telefonie na tym samym koncie Google.\n2. Zrób krótki spacer lub pomiar tętna na zegarku.\n3. Sprawdź, czy widać to w Google Fit w telefonie.\n4. W telefonie: Ustawienia Androida → Health Connect → Uprawnienia aplikacji → Google Fit.\n5. Zezwól Fit na zapis lub udostępnianie kroków, snu (jeśli dostępne) i tętna do Health Connect.\n6. Wróć do ShiftCoach i stuknij Synchronizuj teraz.\n\nShiftCoach prosi tylko o odczyt kroków, snu i tętna — nie kalorii, żywienia ani treningów.',
  'detail.wearablesSetup.samsungHealthStuckTitle': 'Gdy Samsung Health się zawiesza',
  'detail.wearablesSetup.samsungHealthStuckBody':
    'W telefonie:\n\n• Wymuś zatrzymanie Samsung Health (Informacje o aplikacji → Wymuś zatrzymanie).\n• Wyczyść pamięć podręczną (Informacje → Pamięć → Wyczyść pamięć podręczną).\n• Zaktualizuj Samsung Health (Galaxy Store / Sklep Play).\n• W Galaxy Wearable sprawdź połączenie zegarka.\n• Jeśli nadal: wyczyść dane Samsung Health i zaloguj się ponownie.\n\nShiftCoach działa z Google Fit, jeśli Fit zapisuje kroki, sen i tętno w Health Connect — zobacz sekcję Google Fit powyżej.',
  'detail.wearablesSetup.hcDataCheckTitle': 'Sprawdź dane w Health Connect',
  'detail.wearablesSetup.hcDataCheckBody':
    'Zanim obwinisz ShiftCoach, sprawdź Androida:\n\nUstawienia → Health Connect → Dane i dostęp → Kroki, Sen lub Tętno.\n\nDla każdego typu zobacz ostatnie wpisy i źródła.\n\nBez świeżych wpisów w Health Connect ShiftCoach nie ma co czytać — napraw aplikację zapisującą (Samsung Health lub Google Fit), potem zsynchronizuj ponownie.',
  'detail.wearablesSetup.permissionHelpIntro':
    'Problem z wearables? Sprawdź uprawnienia Health Connect (kroki, sen, tętno) w telefonie:',
  'detail.wearablesSetup.helpLinkAppleLabel': 'iPhone: Ruch i fitness (wsparcie Apple)',
  'detail.wearablesSetup.helpLinkAndroidLabel': 'Android: Health Connect (pomoc Google)',

  'detail.wearablesSync.syncWearables': 'Synchronizuj wearables',
  'detail.wearablesSync.syncing': 'Synchronizacja…',
  'detail.wearablesSync.wearablesSynced': 'Wearables zsynchronizowane',
  'detail.wearablesSync.syncFailed': 'Synchronizacja nie powiodła się',
  'detail.wearablesSync.buttonConnectHc': 'Połącz Health Connect',
  'detail.wearablesSync.buttonSyncNow': 'Synchronizuj teraz',
  'detail.wearablesSync.helperConnectFlow':
    'Stuknij Połącz — Android otworzy Health Connect i poprosi o kroki, sen i tętno. Później zmienisz to w ustawieniach Health Connect.',
  'detail.wearablesSync.helperLinkedNative':
    'Health Connect jest połączony. Stuknij, aby zsynchronizować najnowsze kroki, sen i tętno.',
  'detail.wearablesSync.helperDisconnectedWeb':
    'Połącz Health Connect, aby synchronizować kroki, sen i tętno.',
  'detail.wearablesSync.preSyncChecklistTitle': 'Zanim stukniesz Synchronizuj teraz',
  'detail.wearablesSync.preSyncChecklistBody':
    '• Zegarek zapisał dziś dane.\n• Google Fit lub Samsung Health pokazuje je w telefonie.\n• Google Fit lub Samsung Health może zapisywać lub udostępniać do Health Connect (uprawnienia aplikacji).\n• Health Connect pokazuje świeże wpisy kroków, snu lub tętna w sekcji Dane i dostęp.\n• Potem stuknij Synchronizuj teraz w ShiftCoach.',
  'detail.wearablesSync.hcConnectedNoDataBody':
    'Health Connect jest połączony, ale nie znaleziono świeżych danych kroków, snu ani tętna. Otwórz Google Fit lub Samsung Health i upewnij się, że zapisują do Health Connect, potem ponów Synchronizuj teraz.',
  'detail.wearablesSync.sourceChainShort':
    'Samsung Health, Google Fit lub zegarek muszą zapisywać kroki, sen i tętno w Health Connect. ShiftCoach czyta tylko te typy z Health Connect — nie bezpośrednio z zegarka ani aplikacji producenta.',

  'detail.wearablesDebug.title': 'Stan danych wearables',
  'detail.wearablesDebug.backLink': 'Wróć do konfiguracji wearables',
  'detail.wearablesDebug.loading': 'Ładowanie kontroli danych…',
  'detail.wearablesDebug.endpointErrors': 'Błędy endpointów',
  'detail.wearablesDebug.sectionRawDb': 'Surowe zsynchronizowane dane (BD)',
  'detail.wearablesDebug.sectionActivityToday': 'Wyjście API karty: /api/activity/today',
  'detail.wearablesDebug.sectionSleepOverview': 'Wyjście API karty: /api/sleep/overview',
  'detail.wearablesDebug.sectionHeartRate': 'Wyjście API karty: /api/wearables/heart-rate',
}
