/** Dashboard top banners: offline, cache, Google Fit OAuth return — merged in language-provider. */

export const dashboardBannerMessagesEn: Record<string, string> = {
  'dashboard.dismiss': 'Dismiss',
  'dashboard.dismissAria': 'Dismiss message',
  'dashboard.offlineNotice':
    'You are offline. Showing last available dashboard data where possible.',
  'dashboard.cachedNotice': 'Displaying cached guidance until connection is restored.',
  'dashboard.googleFit.success': 'Google Fit connected. You can sync wearables now.',
  'dashboard.googleFit.accessDenied': 'Google Fit connection was denied.',
  'dashboard.googleFit.serverNotConfigured':
    'Google Fit is not configured on the server. Check Vercel env vars and redeploy.',
  'dashboard.googleFit.redirectUriMismatch':
    'Redirect URI mismatch. Ensure GOOGLE_FIT_REDIRECT_URI in Vercel matches Google Cloud exactly.',
  'dashboard.googleFit.tokenExchangeFailed':
    'Token exchange failed. Check client secret and that the redirect URI matches.',
  'dashboard.googleFit.noAccessToken': 'Google did not return an access token.',
  'dashboard.googleFit.missingCode': 'Google did not return an authorization code.',
  'dashboard.googleFit.deprecated':
    'Google Fit onboarding is disabled. Use Health Connect on Android or Apple Health on iPhone.',
  'dashboard.googleFit.unexpected': 'An unexpected error occurred. Check Vercel function logs.',
  'dashboard.googleFit.unknownCode': 'Unknown Google Fit error: {code}',
}

export const dashboardBannerMessagesEs: Record<string, string> = {
  'dashboard.dismiss': 'Cerrar',
  'dashboard.dismissAria': 'Cerrar mensaje',
  'dashboard.offlineNotice':
    'Sin conexión. Mostrando los últimos datos del panel cuando sea posible.',
  'dashboard.cachedNotice': 'Mostrando datos en caché hasta recuperar la conexión.',
  'dashboard.googleFit.success': 'Google Fit conectado. Ya puedes sincronizar wearables.',
  'dashboard.googleFit.accessDenied': 'Se denegó la conexión con Google Fit.',
  'dashboard.googleFit.serverNotConfigured':
    'Google Fit no está configurado en el servidor. Revisa las variables en Vercel y vuelve a desplegar.',
  'dashboard.googleFit.redirectUriMismatch':
    'URI de redirección incorrecta. Asegúrate de que GOOGLE_FIT_REDIRECT_URI en Vercel coincide con Google Cloud.',
  'dashboard.googleFit.tokenExchangeFailed':
    'Error al intercambiar el token. Revisa el secreto del cliente y que la URI de redirección coincida.',
  'dashboard.googleFit.noAccessToken': 'Google no devolvió un token de acceso.',
  'dashboard.googleFit.missingCode': 'Google no devolvió un código de autorización.',
  'dashboard.googleFit.deprecated':
    'La configuración con Google Fit está desactivada. Usa Health Connect en Android o Apple Health en iPhone.',
  'dashboard.googleFit.unexpected': 'Error inesperado. Revisa los registros de funciones en Vercel.',
  'dashboard.googleFit.unknownCode': 'Error desconocido de Google Fit: {code}',
}

export const dashboardBannerMessagesDe: Record<string, string> = {
  'dashboard.dismiss': 'Schließen',
  'dashboard.dismissAria': 'Meldung schließen',
  'dashboard.offlineNotice':
    'Du bist offline. Es werden – wo möglich – die letzten Dashboard-Daten angezeigt.',
  'dashboard.cachedNotice': 'Zwischengespeicherte Inhalte, bis die Verbindung wiederhergestellt ist.',
  'dashboard.googleFit.success': 'Google Fit verbunden. Du kannst Wearables jetzt synchronisieren.',
  'dashboard.googleFit.accessDenied': 'Google-Fit-Verbindung wurde abgelehnt.',
  'dashboard.googleFit.serverNotConfigured':
    'Google Fit ist auf dem Server nicht konfiguriert. Prüfe die Vercel-Umgebungsvariablen und deploye erneut.',
  'dashboard.googleFit.redirectUriMismatch':
    'Redirect-URI stimmt nicht. GOOGLE_FIT_REDIRECT_URI in Vercel muss exakt zu Google Cloud passen.',
  'dashboard.googleFit.tokenExchangeFailed':
    'Token-Austausch fehlgeschlagen. Prüfe Client-Secret und Redirect-URI.',
  'dashboard.googleFit.noAccessToken': 'Google hat kein Zugriffstoken zurückgegeben.',
  'dashboard.googleFit.missingCode': 'Google hat keinen Autorisierungscode zurückgegeben.',
  'dashboard.googleFit.deprecated':
    'Google-Fit-Onboarding ist deaktiviert. Nutze Health Connect (Android) oder Apple Health (iPhone).',
  'dashboard.googleFit.unexpected': 'Unerwarteter Fehler. Prüfe die Vercel-Funktionslogs.',
  'dashboard.googleFit.unknownCode': 'Unbekannter Google-Fit-Fehler: {code}',
}

export const dashboardBannerMessagesFr: Record<string, string> = {
  'dashboard.dismiss': 'Fermer',
  'dashboard.dismissAria': 'Fermer le message',
  'dashboard.offlineNotice':
    'Vous êtes hors ligne. Affichage des dernières données du tableau de bord quand c’est possible.',
  'dashboard.cachedNotice': 'Affichage des données en cache jusqu’au rétablissement de la connexion.',
  'dashboard.googleFit.success': 'Google Fit connecté. Vous pouvez synchroniser les wearables.',
  'dashboard.googleFit.accessDenied': 'Connexion Google Fit refusée.',
  'dashboard.googleFit.serverNotConfigured':
    'Google Fit n’est pas configuré sur le serveur. Vérifiez les variables Vercel et redéployez.',
  'dashboard.googleFit.redirectUriMismatch':
    'URI de redirection incorrecte. GOOGLE_FIT_REDIRECT_URI sur Vercel doit correspondre à Google Cloud.',
  'dashboard.googleFit.tokenExchangeFailed':
    'Échec de l’échange de jeton. Vérifiez le secret client et l’URI de redirection.',
  'dashboard.googleFit.noAccessToken': 'Google n’a pas renvoyé de jeton d’accès.',
  'dashboard.googleFit.missingCode': 'Google n’a pas renvoyé de code d’autorisation.',
  'dashboard.googleFit.deprecated':
    'L’intégration Google Fit est désactivée. Utilisez Health Connect (Android) ou Apple Santé (iPhone).',
  'dashboard.googleFit.unexpected': 'Erreur inattendue. Consultez les journaux Vercel.',
  'dashboard.googleFit.unknownCode': 'Erreur Google Fit inconnue : {code}',
}

export const dashboardBannerMessagesPtBR: Record<string, string> = {
  'dashboard.dismiss': 'Fechar',
  'dashboard.dismissAria': 'Fechar mensagem',
  'dashboard.offlineNotice':
    'Você está offline. Mostrando os últimos dados do painel quando possível.',
  'dashboard.cachedNotice': 'Exibindo dados em cache até a conexão voltar.',
  'dashboard.googleFit.success': 'Google Fit conectado. Você pode sincronizar os wearables.',
  'dashboard.googleFit.accessDenied': 'A conexão com o Google Fit foi negada.',
  'dashboard.googleFit.serverNotConfigured':
    'O Google Fit não está configurado no servidor. Verifique as variáveis no Vercel e faça o deploy de novo.',
  'dashboard.googleFit.redirectUriMismatch':
    'URI de redirecionamento incorreta. GOOGLE_FIT_REDIRECT_URI no Vercel deve bater com o Google Cloud.',
  'dashboard.googleFit.tokenExchangeFailed':
    'Falha na troca de token. Verifique o client secret e a URI de redirecionamento.',
  'dashboard.googleFit.noAccessToken': 'O Google não retornou um token de acesso.',
  'dashboard.googleFit.missingCode': 'O Google não retornou um código de autorização.',
  'dashboard.googleFit.deprecated':
    'O onboarding do Google Fit está desativado. Use o Health Connect no Android ou o Apple Health no iPhone.',
  'dashboard.googleFit.unexpected': 'Erro inesperado. Verifique os logs das funções no Vercel.',
  'dashboard.googleFit.unknownCode': 'Erro desconhecido do Google Fit: {code}',
}

export const dashboardBannerMessagesPl: Record<string, string> = {
  'dashboard.dismiss': 'Zamknij',
  'dashboard.dismissAria': 'Zamknij komunikat',
  'dashboard.offlineNotice':
    'Jesteś offline. Gdy to możliwe, pokazujemy ostatnie dane pulpitu.',
  'dashboard.cachedNotice': 'Wyświetlamy dane z pamięci podręcznej do czasu przywrócenia połączenia.',
  'dashboard.googleFit.success': 'Połączono Google Fit. Możesz synchronizować wearables.',
  'dashboard.googleFit.accessDenied': 'Połączenie z Google Fit zostało odrzucone.',
  'dashboard.googleFit.serverNotConfigured':
    'Google Fit nie jest skonfigurowany na serwerze. Sprawdź zmienne w Vercel i wdróż ponownie.',
  'dashboard.googleFit.redirectUriMismatch':
    'Niezgodny adres przekierowania. GOOGLE_FIT_REDIRECT_URI w Vercel musi dokładnie pasować do Google Cloud.',
  'dashboard.googleFit.tokenExchangeFailed':
    'Wymiana tokenu nie powiodła się. Sprawdź client secret i adres przekierowania.',
  'dashboard.googleFit.noAccessToken': 'Google nie zwrócił tokena dostępu.',
  'dashboard.googleFit.missingCode': 'Google nie zwrócił kodu autoryzacji.',
  'dashboard.googleFit.deprecated':
    'Konfiguracja Google Fit jest wyłączona. Użyj Health Connect (Android) lub Apple Health (iPhone).',
  'dashboard.googleFit.unexpected': 'Nieoczekiwany błąd. Sprawdź logi funkcji w Vercel.',
  'dashboard.googleFit.unknownCode': 'Nieznany błąd Google Fit: {code}',
}
