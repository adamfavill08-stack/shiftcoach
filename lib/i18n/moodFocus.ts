/**
 * Dashboard Mood & Focus card — merged per locale in language-provider.
 * Body strings use blank lines (\n\n) between paragraphs; split in UI with parseMoodFocusBody.
 */
export function parseMoodFocusBody(raw: string): string[] {
  return raw
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export const moodFocusMessagesEn: Record<string, string> = {
  'dashboard.moodFocus.title': 'Mood & Focus',
  'dashboard.moodFocus.today': 'Today',
  'dashboard.moodFocus.intro':
    'Log how you feel right now. Lower scores help ShiftCoach protect your sleep, simplify your day, and adapt your plan around tougher shifts.',
  'dashboard.moodFocus.moodLabel': 'Mood',
  'dashboard.moodFocus.focusLabel': 'Focus',
  'dashboard.moodFocus.disclaimer':
    'Shift Coach is a coaching tool, not a crisis service. If you feel at risk, please contact local emergency or mental health services.',
  'dashboard.moodFocus.scoreCaption': '{kind} · {score}/5 today',
  'dashboard.moodFocus.helpAria': '{label} help',
  'dashboard.moodFocus.sliderLow': 'Low',
  'dashboard.moodFocus.sliderHigh': 'High',
  'dashboard.moodFocus.hintFocusLow': 'Low focus days trigger lighter cognitive loads.',
  'dashboard.moodFocus.hintMoodLow': 'Lower mood signals the need for gentler planning.',

  'dashboard.moodFocus.mood.b1.title': 'Mood is really low today',
  'dashboard.moodFocus.mood.b1.body':
    'Today looks tough. Be kind to yourself – sleep, food and stress all hit harder on shifts.\n\nIf you can, keep your plan light and simple. Short walks, easy meals, and small wins only.\n\nChat with the AI Coach if you’d like support right now.',
  'dashboard.moodFocus.mood.b2.title': 'Not your best day',
  'dashboard.moodFocus.mood.b2.body':
    'Your mood is a bit low. That’s completely normal, especially around nights and quick turnarounds.\n\nFocus on basics: regular meals, hydration, and a short break away from bright screens.',
  'dashboard.moodFocus.mood.b3.title': 'Steady but tired',
  'dashboard.moodFocus.mood.b3.body':
    'You’re doing okay, but there’s room to feel better.\n\nTry one small upgrade today – a 10 minute daylight walk or a proper meal before shift.',
  'dashboard.moodFocus.mood.b4.title': 'Good mood, nice work',
  'dashboard.moodFocus.mood.b4.body':
    'You’re in a good place today. Use it to lock in habits that help future shifts too.',
  'dashboard.moodFocus.mood.b5.title': 'Excellent mood',
  'dashboard.moodFocus.mood.b5.body':
    'You’re feeling great – amazing.\n\nThis is a perfect time to bank some healthy routines for the tougher days.',

  'dashboard.moodFocus.focus.b1.title': 'Focus is very low',
  'dashboard.moodFocus.focus.b1.body':
    'Concentration is really struggling. That can happen with broken sleep or long runs of shifts.\n\nPrioritise safety and simple tasks where you can. Avoid big decisions if possible.\n\nTalking with the AI Coach can help you plan micro-breaks and smarter caffeine timing.',
  'dashboard.moodFocus.focus.b2.title': 'Focus is below usual',
  'dashboard.moodFocus.focus.b2.body':
    'You’re not as sharp as usual today. That’s your body asking for recovery.\n\nUse short breaks, movement and steady meals to keep you going.',
  'dashboard.moodFocus.focus.b3.title': 'Focus is okay',
  'dashboard.moodFocus.focus.b3.body':
    'You’re managing fine, but not at 100%.\n\nTry to protect your next sleep window – it will help tomorrow’s focus a lot.',
  'dashboard.moodFocus.focus.b4.title': 'Focused and on it',
  'dashboard.moodFocus.focus.b4.body':
    'You’re concentrating well today. Great time for important tasks or training.',
  'dashboard.moodFocus.focus.b5.title': 'Super sharp',
  'dashboard.moodFocus.focus.b5.body':
    'Your focus is excellent. Just remember not to overdo caffeine late in your body night.',
}

export const moodFocusMessagesEs: Record<string, string> = {
  'dashboard.moodFocus.title': 'Estado de ánimo y concentración',
  'dashboard.moodFocus.today': 'Hoy',
  'dashboard.moodFocus.intro':
    'Registra cómo te sientes ahora. Las puntuaciones más bajas ayudan a ShiftCoach a proteger tu sueño, simplificar el día y adaptar el plan en turnos duros.',
  'dashboard.moodFocus.moodLabel': 'Ánimo',
  'dashboard.moodFocus.focusLabel': 'Concentración',
  'dashboard.moodFocus.disclaimer':
    'Shift Coach es una herramienta de coaching, no un servicio de crisis. Si te sientes en riesgo, contacta emergencias o salud mental local.',
  'dashboard.moodFocus.scoreCaption': '{kind} · {score}/5 hoy',
  'dashboard.moodFocus.helpAria': 'Ayuda: {label}',
  'dashboard.moodFocus.sliderLow': 'Bajo',
  'dashboard.moodFocus.sliderHigh': 'Alto',
  'dashboard.moodFocus.hintFocusLow': 'Días con poca concentración piden tareas cognitivas más ligeras.',
  'dashboard.moodFocus.hintMoodLow': 'Un ánimo más bajo indica conviene planificar con más suavidad.',

  'dashboard.moodFocus.mood.b1.title': 'El ánimo está muy bajo hoy',
  'dashboard.moodFocus.mood.b1.body':
    'Hoy cuesta. Sé amable contigo: sueño, comida y estrés pesan más en turnos.\n\nSi puedes, mantén el plan simple: caminatas cortas, comidas fáciles y pequeños logros.\n\nHabla con el coach de IA si quieres apoyo ahora.',
  'dashboard.moodFocus.mood.b2.title': 'No es tu mejor día',
  'dashboard.moodFocus.mood.b2.body':
    'El ánimo está algo bajo. Es normal, sobre todo con noches y cambios rápidos.\n\nPrioriza lo básico: comidas regulares, hidratación y un descanso lejos de pantallas brillantes.',
  'dashboard.moodFocus.mood.b3.title': 'Estable pero cansado',
  'dashboard.moodFocus.mood.b3.body':
    'Vas bien, pero puedes sentirte mejor.\n\nPrueba un pequeño cambio hoy: 10 minutos de luz natural o una comida decente antes del turno.',
  'dashboard.moodFocus.mood.b4.title': 'Buen ánimo, bien hecho',
  'dashboard.moodFocus.mood.b4.body':
    'Hoy estás en un buen momento. Aprovéchalo para fijar hábitos que ayuden en turnos futuros.',
  'dashboard.moodFocus.mood.b5.title': 'Ánimo excelente',
  'dashboard.moodFocus.mood.b5.body':
    'Te sientes genial.\n\nEs buen momento para reforzar rutinas saludables para los días más duros.',

  'dashboard.moodFocus.focus.b1.title': 'Concentración muy baja',
  'dashboard.moodFocus.focus.b1.body':
    'Cuesta concentrarse. Pasa con sueño fragmentado o muchas jornadas seguidas.\n\nPrioriza seguridad y tareas simples. Evita decisiones grandes si puedes.\n\nEl coach de IA puede ayudarte con microdescansos y cafeína más inteligente.',
  'dashboard.moodFocus.focus.b2.title': 'Menos concentración de lo habitual',
  'dashboard.moodFocus.focus.b2.body':
    'Hoy no estás tan afilado. Es tu cuerpo pidiendo recuperación.\n\nUsa pausas cortas, movimiento y comidas estables para seguir.',
  'dashboard.moodFocus.focus.b3.title': 'Concentración aceptable',
  'dashboard.moodFocus.focus.b3.body':
    'Vas bien, pero no al 100%.\n\nProtege tu próxima ventana de sueño: ayudará mucho a concentrarte mañana.',
  'dashboard.moodFocus.focus.b4.title': 'Enfocado y al pie del cañón',
  'dashboard.moodFocus.focus.b4.body':
    'Hoy concentras bien. Buen momento para tareas importantes o formación.',
  'dashboard.moodFocus.focus.b5.title': 'Muy despierto',
  'dashboard.moodFocus.focus.b5.body':
    'Tu concentración es excelente. Solo evita abusar de la cafeína tarde en tu “noche biológica”.',
}

export const moodFocusMessagesDe: Record<string, string> = {
  'dashboard.moodFocus.title': 'Stimmung & Fokus',
  'dashboard.moodFocus.today': 'Heute',
  'dashboard.moodFocus.intro':
    'Trage ein, wie du dich gerade fühlst. Niedrigere Werte helfen ShiftCoach, Schlaf zu schützen, den Tag zu vereinfachen und den Plan bei harten Schichten anzupassen.',
  'dashboard.moodFocus.moodLabel': 'Stimmung',
  'dashboard.moodFocus.focusLabel': 'Fokus',
  'dashboard.moodFocus.disclaimer':
    'Shift Coach ist Coaching, kein Krisendienst. Wenn du dich in Gefahr fühlst, wende dich an örtliche Not- oder psychiatrische Hilfe.',
  'dashboard.moodFocus.scoreCaption': '{kind} · {score}/5 heute',
  'dashboard.moodFocus.helpAria': 'Hilfe: {label}',
  'dashboard.moodFocus.sliderLow': 'Niedrig',
  'dashboard.moodFocus.sliderHigh': 'Hoch',
  'dashboard.moodFocus.hintFocusLow': 'Tage mit wenig Fokus brauchen leichtere kognitive Last.',
  'dashboard.moodFocus.hintMoodLow': 'Tiefere Stimmung heißt: Planung lieber sanfter gestalten.',

  'dashboard.moodFocus.mood.b1.title': 'Die Stimmung ist heute sehr niedrig',
  'dashboard.moodFocus.mood.b1.body':
    'Heute ist hart. Sei nett zu dir – Schlaf, Essen und Stress belasten in Schichten stärker.\n\nWenn möglich, halte den Plan leicht: kurze Spaziergänge, einfache Mahlzeiten, kleine Erfolge.\n\nSprich mit dem KI-Coach, wenn du jetzt Unterstützung willst.',
  'dashboard.moodFocus.mood.b2.title': 'Nicht dein bester Tag',
  'dashboard.moodFocus.mood.b2.body':
    'Die Stimmung ist etwas tief. Das ist normal, besonders bei Nächten und kurzen Wechseln.\n\nGrundlagen: regelmäßig essen, trinken, kurze Pause ohne grellen Bildschirm.',
  'dashboard.moodFocus.mood.b3.title': 'Stabil, aber müde',
  'dashboard.moodFocus.mood.b3.body':
    'Es geht, aber es geht noch besser.\n\nEine kleine Verbesserung heute: 10 Minuten Tageslicht oder eine ordentliche Mahlzeit vor der Schicht.',
  'dashboard.moodFocus.mood.b4.title': 'Gute Stimmung, stark',
  'dashboard.moodFocus.mood.b4.body':
    'Du bist heute gut drauf. Nutze das, um Gewohnheiten zu festigen, die künftige Schichten erleichtern.',
  'dashboard.moodFocus.mood.b5.title': 'Ausgezeichnete Stimmung',
  'dashboard.moodFocus.mood.b5.body':
    'Du fühlst dich großartig.\n\nJetzt lohnt es sich, gesunde Routinen für härtere Tage aufzubauen.',

  'dashboard.moodFocus.focus.b1.title': 'Fokus ist sehr niedrig',
  'dashboard.moodFocus.focus.b1.body':
    'Konzentration klappt kaum. Das passiert bei Schlafdefizit oder langen Schichtserien.\n\nSicherheit und einfache Aufgaben priorisieren. Große Entscheidungen meiden.\n\nDer KI-Coach hilft bei Mikropausen und klügerem Koffein.',
  'dashboard.moodFocus.focus.b2.title': 'Fokus unter dem Üblichen',
  'dashboard.moodFocus.focus.b2.body':
    'Heute bist du nicht so scharf. Dein Körper braucht Erholung.\n\nKurze Pausen, Bewegung, gleichmäßige Mahlzeiten helfen weiter.',
  'dashboard.moodFocus.focus.b3.title': 'Fokus ist okay',
  'dashboard.moodFocus.focus.b3.body':
    'Du kommst zurecht, aber nicht mit 100%.\n\nSchütze dein nächstes Schlaffenster – das hilft morgen beim Fokus stark.',
  'dashboard.moodFocus.focus.b4.title': 'Fokussiert und dabei',
  'dashboard.moodFocus.focus.b4.body':
    'Du konzentrierst dich gut. Gute Zeit für wichtige Aufgaben oder Training.',
  'dashboard.moodFocus.focus.b5.title': 'Ganz scharf',
  'dashboard.moodFocus.focus.b5.body':
    'Dein Fokus ist top. Achte nur darauf, spät in deiner biologischen Nacht nicht zu viel Koffein zu nehmen.',
}

export const moodFocusMessagesFr: Record<string, string> = {
  'dashboard.moodFocus.title': 'Humeur et concentration',
  'dashboard.moodFocus.today': "Aujourd'hui",
  'dashboard.moodFocus.intro':
    'Indiquez comment vous vous sentez maintenant. Des scores plus bas aident ShiftCoach à protéger votre sommeil, simplifier la journée et adapter le plan sur les shifts difficiles.',
  'dashboard.moodFocus.moodLabel': 'Humeur',
  'dashboard.moodFocus.focusLabel': 'Concentration',
  'dashboard.moodFocus.disclaimer':
    'Shift Coach est un outil de coaching, pas un service de crise. Si vous vous sentez en danger, contactez les urgences ou une aide psychologique locale.',
  'dashboard.moodFocus.scoreCaption': '{kind} · {score}/5 aujourd’hui',
  'dashboard.moodFocus.helpAria': 'Aide : {label}',
  'dashboard.moodFocus.sliderLow': 'Faible',
  'dashboard.moodFocus.sliderHigh': 'Élevé',
  'dashboard.moodFocus.hintFocusLow': 'Les jours avec peu de concentration appellent des charges cognitives plus légères.',
  'dashboard.moodFocus.hintMoodLow': 'Une humeur plus basse invite à planifier plus doucement.',

  'dashboard.moodFocus.mood.b1.title': 'Humeur très basse aujourd’hui',
  'dashboard.moodFocus.mood.b1.body':
    'La journée est dure. Soyez bienveillant avec vous-même : sommeil, alimentation et stress pèsent plus en shift.\n\nSi vous pouvez, gardez un plan simple : courtes marches, repas faciles, petites victoires.\n\nParlez au coach IA si vous voulez du soutien maintenant.',
  'dashboard.moodFocus.mood.b2.title': 'Pas votre meilleur jour',
  'dashboard.moodFocus.mood.b2.body':
    'L’humeur est un peu basse. C’est normal, surtout avec des nuits et des enchaînements serrés.\n\nLes bases : repas réguliers, hydratation, courte pause loin des écrans vifs.',
  'dashboard.moodFocus.mood.b3.title': 'Stable mais fatigué',
  'dashboard.moodFocus.mood.b3.body':
    'Vous tenez le coup, mais vous pourriez vous sentir mieux.\n\nUn petit plus aujourd’hui : 10 minutes de lumière du jour ou un vrai repas avant le shift.',
  'dashboard.moodFocus.mood.b4.title': 'Bonne humeur, bravo',
  'dashboard.moodFocus.mood.b4.body':
    'Vous êtes bien aujourd’hui. Profitez-en pour ancrer des habitudes utiles pour les prochains shifts.',
  'dashboard.moodFocus.mood.b5.title': 'Humeur excellente',
  'dashboard.moodFocus.mood.b5.body':
    'Vous vous sentez super.\n\nC’est le bon moment pour renforcer des routines saines pour les jours plus durs.',

  'dashboard.moodFocus.focus.b1.title': 'Concentration très faible',
  'dashboard.moodFocus.focus.b1.body':
    'La concentration souffre. C’est fréquent avec un sommeil fragmenté ou des séries de shifts.\n\nPriorisez la sécurité et les tâches simples. Évitez les grosses décisions si possible.\n\nLe coach IA peut aider pour les micro-pauses et la caféine.',
  'dashboard.moodFocus.focus.b2.title': 'Concentration sous la normale',
  'dashboard.moodFocus.focus.b2.body':
    "Vous n’êtes pas aussi affûté qu’habituellement. C’est le corps qui demande du récup.\n\nCourtes pauses, mouvement, repas réguliers pour tenir.",
  'dashboard.moodFocus.focus.b3.title': 'Concentration correcte',
  'dashboard.moodFocus.focus.b3.body':
    'Vous gérez, mais pas à 100%.\n\nProtégez votre prochaine fenêtre de sommeil : ça aidera beaucoup demain.',
  'dashboard.moodFocus.focus.b4.title': 'Concentré et efficace',
  'dashboard.moodFocus.focus.b4.body':
    'Vous vous concentrez bien. Bon moment pour les tâches importantes ou la formation.',
  'dashboard.moodFocus.focus.b5.title': 'Très vif',
  'dashboard.moodFocus.focus.b5.body':
    'Votre concentration est excellente. Évitez juste trop de caféine tard dans votre nuit biologique.',
}

export const moodFocusMessagesPtBR: Record<string, string> = {
  'dashboard.moodFocus.title': 'Humor e foco',
  'dashboard.moodFocus.today': 'Hoje',
  'dashboard.moodFocus.intro':
    'Registre como você se sente agora. Notas mais baixas ajudam o ShiftCoach a proteger o sono, simplificar o dia e adaptar o plano nos turnos mais pesados.',
  'dashboard.moodFocus.moodLabel': 'Humor',
  'dashboard.moodFocus.focusLabel': 'Foco',
  'dashboard.moodFocus.disclaimer':
    'O Shift Coach é ferramenta de coaching, não serviço de crise. Se estiver em risco, procure emergência ou saúde mental local.',
  'dashboard.moodFocus.scoreCaption': '{kind} · {score}/5 hoje',
  'dashboard.moodFocus.helpAria': 'Ajuda: {label}',
  'dashboard.moodFocus.sliderLow': 'Baixo',
  'dashboard.moodFocus.sliderHigh': 'Alto',
  'dashboard.moodFocus.hintFocusLow': 'Dias com pouco foco pedem carga cognitiva mais leve.',
  'dashboard.moodFocus.hintMoodLow': 'Humor mais baixo pede planejamento mais gentil.',

  'dashboard.moodFocus.mood.b1.title': 'Humor bem baixo hoje',
  'dashboard.moodFocus.mood.b1.body':
    'O dia está pesado. Seja gentil com você: sono, comida e estresse pesam mais em turno.\n\nSe der, mantenha o plano leve: caminhadas curtas, refeições fáceis, pequenas vitórias.\n\nFale com o coach de IA se quiser apoio agora.',
  'dashboard.moodFocus.mood.b2.title': 'Não é seu melhor dia',
  'dashboard.moodFocus.mood.b2.body':
    'O humor está um pouco baixo. É normal, principalmente com noites e viradas apertadas.\n\nFoque no básico: refeições regulares, hidratação e uma pausa longe de telas fortes.',
  'dashboard.moodFocus.mood.b3.title': 'Estável, mas cansado',
  'dashboard.moodFocus.mood.b3.body':
    'Você vai bem, mas dá para melhorar.\n\nTente um upgrade pequeno hoje: 10 min de luz do dia ou uma refeição decente antes do turno.',
  'dashboard.moodFocus.mood.b4.title': 'Bom humor, muito bem',
  'dashboard.moodFocus.mood.b4.body':
    'Você está bem hoje. Use isso para fixar hábitos que ajudem nos próximos turnos.',
  'dashboard.moodFocus.mood.b5.title': 'Humor excelente',
  'dashboard.moodFocus.mood.b5.body':
    'Você está ótimo.\n\nÉ um bom momento para reforçar rotinas saudáveis para os dias mais difíceis.',

  'dashboard.moodFocus.focus.b1.title': 'Foco muito baixo',
  'dashboard.moodFocus.focus.b1.body':
    'A concentração está sofrendo. Acontece com sono quebrado ou muitos turnos seguidos.\n\nPriorize segurança e tarefas simples. Evite decisões grandes se puder.\n\nO coach de IA ajuda com micro-pausas e cafeína mais inteligente.',
  'dashboard.moodFocus.focus.b2.title': 'Foco abaixo do normal',
  'dashboard.moodFocus.focus.b2.body':
    'Hoje você não está tão afiado. É o corpo pedindo recuperação.\n\nUse pausas curtas, movimento e refeições estáveis.',
  'dashboard.moodFocus.focus.b3.title': 'Foco ok',
  'dashboard.moodFocus.focus.b3.body':
    'Você se vira bem, mas não está 100%.\n\nProteja sua próxima janela de sono: isso ajuda muito o foco de amanhã.',
  'dashboard.moodFocus.focus.b4.title': 'Focado e em dia',
  'dashboard.moodFocus.focus.b4.body':
    'Você está concentrado. Bom momento para tarefas importantes ou treino.',
  'dashboard.moodFocus.focus.b5.title': 'Super afiado',
  'dashboard.moodFocus.focus.b5.body':
    'Seu foco está excelente. Só evite exagerar na cafeína tarde na sua noite biológica.',
}

export const moodFocusMessagesPl: Record<string, string> = {
  'dashboard.moodFocus.title': 'Nastrój i koncentracja',
  'dashboard.moodFocus.today': 'Dziś',
  'dashboard.moodFocus.intro':
    'Zapisz, jak się teraz czujesz. Niższe oceny pomagają ShiftCoach chronić sen, uprościć dzień i dostosować plan przy cięższych zmianach.',
  'dashboard.moodFocus.moodLabel': 'Nastrój',
  'dashboard.moodFocus.focusLabel': 'Koncentracja',
  'dashboard.moodFocus.disclaimer':
    'Shift Coach to narzędzie coachingowe, nie pogotowie kryzysowe. Jeśli czujesz zagrożenie, skontaktuj się z lokalnymi służbami ratunkowymi lub wsparciem psychologicznym.',
  'dashboard.moodFocus.scoreCaption': '{kind} · {score}/5 dziś',
  'dashboard.moodFocus.helpAria': 'Pomoc: {label}',
  'dashboard.moodFocus.sliderLow': 'Nisko',
  'dashboard.moodFocus.sliderHigh': 'Wysoko',
  'dashboard.moodFocus.hintFocusLow': 'Przy niskim skupieniu warto lżejsze obciążenie poznawcze.',
  'dashboard.moodFocus.hintMoodLow': 'Niższy nastrój sygnalizuje łagodniejsze planowanie.',

  'dashboard.moodFocus.mood.b1.title': 'Dziś nastrój jest bardzo niski',
  'dashboard.moodFocus.mood.b1.body':
    'Ciężki dzień. Bądź dla siebie wyrozumiały – sen, jedzenie i stres przy zmianach bolą mocniej.\n\nJeśli możesz, uprość plan: krótkie spacery, łatwe posiłki, małe sukcesy.\n\nPorozmawiaj z trenerem AI, jeśli chcesz wsparcia teraz.',
  'dashboard.moodFocus.mood.b2.title': 'Nie najlepszy dzień',
  'dashboard.moodFocus.mood.b2.body':
    'Nastrój trochę niżej. To normalne, zwłaszcza przy nocach i krótkich przerwach.\n\nPodstawy: regularne posiłki, nawodnienie i krótka przerwa bez jasnego ekranu.',
  'dashboard.moodFocus.mood.b3.title': 'Stabilnie, ale zmęczony',
  'dashboard.moodFocus.mood.b3.body':
    'Jest ok, ale można lepiej.\n\nMały krok dziś: 10 min światła dziennego lub solidny posiłek przed zmianą.',
  'dashboard.moodFocus.mood.b4.title': 'Dobry nastrój, brawo',
  'dashboard.moodFocus.mood.b4.body':
    'Dziś jest dobrze. Wykorzystaj to, by utrwalić nawyki na przyszłe zmiany.',
  'dashboard.moodFocus.mood.b5.title': 'Świetny nastrój',
  'dashboard.moodFocus.mood.b5.body':
    'Czujesz się świetnie.\n\nTo dobry moment, by wzmocnić zdrowe rutyny na trudniejsze dni.',

  'dashboard.moodFocus.focus.b1.title': 'Koncentracja bardzo niska',
  'dashboard.moodFocus.focus.b1.body':
    'Trudno się skupić. Zdarza się przy zaburzonym śnie lub długich seriach zmian.\n\nPriorytet: bezpieczeństwo i proste zadania. Unikaj dużych decyzji, jeśli możesz.\n\nTrener AI pomoże zaplanować mikroprzerwy i mądrzejszą kofeinę.',
  'dashboard.moodFocus.focus.b2.title': 'Koncentracja poniżej normy',
  'dashboard.moodFocus.focus.b2.body':
    'Dziś nie jesteś tak bystry. To sygnał, że ciało potrzebuje regeneracji.\n\nKrótkie przerwy, ruch, stałe posiłki pomogą.',
  'dashboard.moodFocus.focus.b3.title': 'Koncentracja w porządku',
  'dashboard.moodFocus.focus.b3.body':
    'Dajesz radę, ale nie na 100%.\n\nChroń następne okno snu – to mocno pomoże jutrzejszej koncentracji.',
  'dashboard.moodFocus.focus.b4.title': 'Skupiony i w grze',
  'dashboard.moodFocus.focus.b4.body':
    'Dobrze się koncentrujesz. Dobry moment na ważne zadania lub szkolenie.',
  'dashboard.moodFocus.focus.b5.title': 'Bardzo bystry',
  'dashboard.moodFocus.focus.b5.body':
    'Koncentracja na topie. Tylko nie przesadzaj z kofeiną późno w swojej biologicznej nocy.',
}
