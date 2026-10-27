import { useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Minus, Play, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { regionFromMunicipality } from "@/lib/region";
import { getState, loginAs, setRegion, submitProof, useLang } from "../store";
import { DEMO_IDS } from "../seed";
import { navigate } from "../router";
import { drawSamplePhoto } from "../demoAi";
import { hashBytes, uid } from "../media";
import { loadMunicipalities } from "../municipalities";

/**
 * "Presentation mode": a 3-minute guided walk through the app's own flow
 * (mission → photo proof → AI → moderation → FONE payout → wallet/ranking),
 * switching demo profiles automatically. Start it from the login screen or with ?tour=1.
 */

type Text3 = Record<Lang, string>;
type Step = { title: Text3; text: Text3; run?: () => void | Promise<void> };

const RECIFE = 2611606;

async function chooseRecife() {
  const m = (await loadMunicipalities()).find((x) => x[0] === RECIFE);
  if (m) setRegion(regionFromMunicipality(m, 30, "manual"));
}

/** Sends a proof with a sample photo for a mission that can be done anywhere, then shows the result. */
async function sendSampleProof() {
  const photo = drawSamplePhoto("recycling");
  const photoHash = await hashBytes(new TextEncoder().encode(photo + uid()));
  const report =
    "Separei plástico, papel e metal em sacolas diferentes, lavei as embalagens e deixei tudo pronto para a coleta seletiva do bairro.";
  for (const missionId of ["m-casa-reciclaveis", "m-casa-oleo"]) {
    const already = getState().submissions.some((s) => s.userId === DEMO_IDS.citizen && s.missionId === missionId && s.status !== "rejected");
    if (already) continue;
    const result = submitProof({ missionId, photo, photoHash, report, latitude: -8.05, longitude: -34.9, accuracy: 15, simulatedLocation: true, sample: "recycling" });
    if (!result.error) break;
  }
  navigate("/submissions");
}

const STEPS: Step[] = [
  {
    title: { pt: "EcoVerify em 3 minutos", en: "EcoVerify in 3 minutes", es: "EcoVerify en 3 minutos" },
    text: {
      pt: "Uma pessoa faz uma ação sustentável, prova com foto + GPS, a IA confere, a moderação garante e o FONE é pago de forma transparente. Vamos seguir esse caminho trocando de perfil sozinhos.",
      en: "Someone does a sustainable action, proves it with photo + GPS, the AI checks it, moderators make sure and FONE is paid transparently. We will follow that path, switching profiles automatically.",
      es: "Una persona hace una acción sostenible, la prueba con foto + GPS, la IA la revisa, la moderación la garantiza y el FONE se paga de forma transparente. Seguiremos ese camino cambiando de perfil solos.",
    },
  },
  {
    title: { pt: "1. Missões perto de você", en: "1. Missions near you", es: "1. Misiones cerca de ti" },
    text: {
      pt: "Maria (cidadã) vê as missões da região dela, da mais perto para a mais longe, e as que dá para fazer de casa. Em uma cidade sem missões, o app cria missões a partir do OpenStreetMap e as pessoas podem pedir ou sugerir ações.",
      en: "Maria (citizen) sees the missions in her area, closest first, plus the ones she can do at home. In a city without missions the app creates them from OpenStreetMap, and people can ask for or suggest actions.",
      es: "María (ciudadana) ve las misiones de su región, de la más cercana a la más lejana, y las que puede hacer en casa. En una ciudad sin misiones, la app las crea desde OpenStreetMap y la gente puede pedir o sugerir acciones.",
    },
    run: async () => {
      loginAs(DEMO_IDS.citizen);
      await chooseRecife();
      navigate("/missions");
    },
  },
  {
    title: { pt: "2. Prova com foto e a IA", en: "2. Photo proof and the AI", es: "2. Prueba con foto y la IA" },
    text: {
      pt: "Enviamos uma comprovação de exemplo. A IA (gratuita no piloto) confere se a foto combina com a missão, se não é foto de tela ou repetida, e aprova sozinha só os casos claros, sempre dizendo o motivo. Quem discordar pode contestar e uma pessoa revisa.",
      en: "We sent a sample proof. The AI (free in the pilot) checks that the photo matches the mission and is not a screenshot or a repeat, and only approves clear cases on its own, always giving the reason. Anyone who disagrees can appeal to a person.",
      es: "Enviamos una prueba de ejemplo. La IA (gratuita en el piloto) revisa que la foto coincida con la misión y que no sea captura ni repetida, y solo aprueba sola los casos claros, siempre con el motivo. Quien no esté de acuerdo puede apelar a una persona.",
    },
    run: async () => {
      loginAs(DEMO_IDS.citizen);
      await sendSampleProof();
    },
  },
  {
    title: { pt: "3. Moderação", en: "3. Moderation", es: "3. Moderación" },
    text: {
      pt: "Carlos (moderador) recebe os casos duvidosos e as contestações, já com a sugestão da IA, a foto, o relato e a distância até o local. Ele aprova ou rejeita com um motivo padronizado.",
      en: "Carlos (moderator) gets the doubtful cases and the appeals, with the AI suggestion, photo, report and distance to the place. He approves or rejects with a standard reason.",
      es: "Carlos (moderador) recibe los casos dudosos y las apelaciones, con la sugerencia de la IA, la foto, el relato y la distancia al lugar. Aprueba o rechaza con un motivo estándar.",
    },
    run: () => {
      loginAs(DEMO_IDS.moderator);
      navigate("/moderation");
    },
  },
  {
    title: { pt: "4. Pagamento em FONE", en: "4. FONE payout", es: "4. Pago en FONE" },
    text: {
      pt: "Ana (admin) vê a fila na aba Recompensas. O FONE só vai para carteiras verificadas de maiores de 18 anos, depois de 7 dias de carência e a partir de 5 FONE (por causa da taxa da rede). Orçamento mensal, limite por pessoa e patrocinadores com orçamento próprio protegem a tesouraria.",
      en: "Ana (admin) sees the queue in the Rewards tab. FONE only goes to verified wallets of people over 18, after a 7-day hold period and from 5 FONE up (because of the network fee). A monthly budget, a per-person limit and sponsors with their own budget protect the treasury.",
      es: "Ana (admin) ve la cola en la pestaña Recompensas. El FONE solo va a billeteras verificadas de mayores de 18 años, tras 7 días de carencia y desde 5 FONE (por la comisión de la red). Un presupuesto mensual, un límite por persona y patrocinadores con presupuesto propio protegen la tesorería.",
    },
    run: () => {
      loginAs(DEMO_IDS.admin);
      try {
        sessionStorage.setItem("ecoverify-admin-tab", "rewards");
      } catch {
        // Private mode: the admin screen just opens on the first tab.
      }
      navigate("/admin");
    },
  },
  {
    title: { pt: "5. Carteira, pontos e ranking", en: "5. Wallet, points and ranking", es: "5. Billetera, puntos y ranking" },
    text: {
      pt: "De volta à Maria: pontos, FONE recebido, carteira verificada e o histórico com link para o explorer. Menores participam com pontos e ranking; o FONE fica para maiores de 18.",
      en: "Back to Maria: points, FONE received, verified wallet and the history with explorer links. Minors take part with points and ranking; FONE is for people over 18.",
      es: "De vuelta con María: puntos, FONE recibido, billetera verificada y el historial con enlace al explorador. Los menores participan con puntos y ranking; el FONE es para mayores de 18.",
    },
    run: () => {
      loginAs(DEMO_IDS.citizen);
      navigate("/profile");
    },
  },
  {
    title: { pt: "6. Escolas, empresas e prefeituras", en: "6. Schools, companies and city halls", es: "6. Escuelas, empresas y alcaldías" },
    text: {
      pt: "Para o cidadão é sempre grátis. Quem paga são as organizações: Carlos coordena a Escola Técnica Exemplo, com missões só da escola, ranking da turma, relatório de impacto e certificados. O plano é pago por Pix (QR code) e a Ana confirma em Admin → Negócios. É assim que o EcoVerify se sustenta.",
      en: "Citizens never pay. Organizations do: Carlos runs the Escola Técnica Exemplo, with school-only missions, class ranking, impact report and certificates. The plan is paid by Pix (QR code) and Ana confirms it in Admin → Business. That's how EcoVerify sustains itself.",
      es: "Para el ciudadano siempre es gratis. Pagan las organizaciones: Carlos coordina la Escola Técnica Exemplo, con misiones solo de la escuela, ranking del grupo, informe de impacto y certificados. El plan se paga por Pix (código QR) y Ana lo confirma en Admin → Negocios. Así se sostiene EcoVerify.",
    },
    run: () => {
      loginAs(DEMO_IDS.moderator);
      navigate("/org/escola-tecnica-exemplo/plan");
    },
  },
  {
    title: { pt: "Pronto!", en: "Done!", es: "¡Listo!" },
    text: {
      pt: "Esta é a página pública de Transparência: impacto, FONE pago e patrocinadores, sem nomes. Agora explore à vontade: troque de perfil no menu, escolha outra cidade em Missões ou envie uma foto de verdade. Tudo fica só neste aparelho.",
      en: "This is the public Transparency page: impact, FONE paid and sponsors, with no names. Now explore freely: switch profiles from the menu, pick another city in Missions or send a real photo. Everything stays on this device.",
      es: "Esta es la página pública de Transparencia: impacto, FONE pagado y patrocinadores, sin nombres. Ahora explora libremente: cambia de perfil en el menú, elige otra ciudad en Misiones o envía una foto real. Todo queda solo en este dispositivo.",
    },
    run: () => navigate("/transparencia"),
  },
];

const KEY = "ecoverify-tour";
type TourState = { step: number; minimized: boolean } | null;
const listeners = new Set<() => void>();
let current: TourState = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "null") as TourState;
  } catch {
    return null;
  }
})();

function set(next: TourState) {
  current = next;
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Private mode: the tour still works for this page view.
  }
  listeners.forEach((l) => l());
}

function goTo(step: number) {
  const index = Math.max(0, Math.min(STEPS.length - 1, step));
  set({ step: index, minimized: false });
  void STEPS[index].run?.();
}

export function startTour() {
  goTo(0);
}

const LABELS = {
  start: { pt: "Modo apresentação (3 min)", en: "Presentation mode (3 min)", es: "Modo presentación (3 min)" },
  startHint: {
    pt: "Um passo a passo que troca de perfil sozinho. Ideal para mostrar o app.",
    en: "A walkthrough that switches profiles for you. Ideal to show the app.",
    es: "Un paso a paso que cambia de perfil solo. Ideal para mostrar la app.",
  },
  next: { pt: "Próximo", en: "Next", es: "Siguiente" },
  begin: { pt: "Começar", en: "Start", es: "Empezar" },
  back: { pt: "Voltar", en: "Back", es: "Atrás" },
  finish: { pt: "Encerrar", en: "Finish", es: "Terminar" },
  close: { pt: "Fechar apresentação", en: "Close presentation", es: "Cerrar presentación" },
  minimize: { pt: "Minimizar", en: "Minimize", es: "Minimizar" },
  open: { pt: "Apresentação", en: "Presentation", es: "Presentación" },
} satisfies Record<string, Text3>;

/** Button for the login screen. */
export function TourStartButton() {
  const lang = useLang();
  return (
    <button
      type="button"
      onClick={startTour}
      data-testid="tour-start"
      className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400 text-amber-950">
        <Play className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-bold text-amber-950">{LABELS.start[lang]}</span>
        <span className="block text-xs text-amber-900/80">{LABELS.startHint[lang]}</span>
      </span>
    </button>
  );
}

/** Floating panel shown on every screen while the tour runs. */
export function TourPanel() {
  const lang = useLang();
  const tour = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
  if (!tour) return null;
  const step = STEPS[tour.step];
  const last = tour.step === STEPS.length - 1;

  if (tour.minimized) {
    return (
      <button
        type="button"
        onClick={() => set({ ...tour, minimized: false })}
        className="fixed bottom-20 right-3 z-[60] flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-amber-950 shadow-lg md:bottom-5 md:right-5"
      >
        <Play className="h-4 w-4" /> {LABELS.open[lang]} {tour.step}/{STEPS.length - 1}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={step.title[lang]}
      data-testid="tour-panel"
      className="fixed inset-x-3 bottom-20 z-[60] rounded-2xl border border-amber-200 bg-white p-4 shadow-[0_20px_50px_rgba(16,24,40,0.25)] md:inset-x-auto md:bottom-5 md:right-5 md:w-[380px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
            {LABELS.open[lang]} · {tour.step}/{STEPS.length - 1}
          </p>
          <h2 className="font-bold text-slate-900" data-testid="tour-title">{step.title[lang]}</h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => set({ ...tour, minimized: true })} aria-label={LABELS.minimize[lang]} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => set(null)} aria-label={LABELS.close[lang]} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text[lang]}</p>
      <div className="mt-2 flex gap-1" aria-hidden>
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= tour.step ? "bg-amber-400" : "bg-slate-200"}`} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goTo(tour.step - 1)}
          disabled={tour.step === 0}
          className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> {LABELS.back[lang]}
        </button>
        <button
          type="button"
          data-testid="tour-next"
          onClick={() => (last ? set(null) : goTo(tour.step + 1))}
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {last ? LABELS.finish[lang] : tour.step === 0 ? LABELS.begin[lang] : LABELS.next[lang]} {!last && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
