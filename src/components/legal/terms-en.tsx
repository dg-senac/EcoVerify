import { FONE_MIN_AGE, MIN_AGE, type LegalInfo } from "@/lib/legal";
import { LegalList, LegalSection, contactText } from "./legal-ui";

/** English translation of the Terms of Use. The Portuguese version (terms-content.tsx) prevails: keep both in sync. */
export function TermsEn({ info }: { info: LegalInfo }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">
        These Terms govern the use of EcoVerify, an app that recognizes verified sustainable actions (recycling, planting,
        donations, clean-ups) with points and, for adults, rewards in the FONE cryptocurrency. EcoVerify is maintained by{" "}
        <b>{info.controllerName}</b>. By creating an account, you declare that you have read and agree to these Terms and to the
        Privacy Policy.
      </p>

      <LegalSection n={1} title="Who can use it">
        <LegalList
          items={[
            <>You must be <b>{MIN_AGE} or older</b>. People aged {MIN_AGE} to 17 may only use it with the permission of a parent or legal guardian.</>,
            <>FONE rewards are only for people aged <b>{FONE_MIN_AGE} or older</b>. Minors take part with points, levels and the ranking.</>,
            "Each person may have only one account and one linked FONE wallet. Multiple accounts, third-party accounts or automated accounts are forbidden.",
          ]}
        />
      </LegalSection>

      <LegalSection n={2} title="Your account">
        <p>
          You are responsible for keeping your email up to date and your password secret. Let us know if you suspect misuse. You
          can delete your account at any time in Settings.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Missions and proofs">
        <LegalList
          items={[
            "Only send truthful proofs: the action must have been done by you, at the mission location, and the photo must be yours and recent.",
            "The app uses the device's location at the time of the proof to check that you are at the mission location.",
            "Each proof goes through an automatic check (app rules and an artificial intelligence model) and through the moderation team. Clear cases may be approved or rejected automatically, always with the reason given; the others are decided by a person.",
            "If one of your proofs is rejected automatically, you can appeal in My Submissions: the appeal is always reviewed by a person from the moderation team.",
            "Repeated photos, edited images, photos of screens, faked location or any attempt at fraud lead to rejection and may lead to cards (section 8), suspension, blocking and cancellation of rewards.",
            "By sending a photo, you authorize EcoVerify to store it, show it to the moderation team and send it, reduced and without personal data, to the automatic verification service. We do not publish your photo outside the app without your permission. Avoid photographing other people's faces.",
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="Points">
        <p>Points and levels measure your participation. They have no cash value and cannot be sold, exchanged or transferred.</p>
      </LegalSection>

      <LegalSection n={5} title="FONE rewards">
        <LegalList
          items={[
            "FONE is the cryptocurrency of the Fone Protocol network. Rewards depend on the budget available to EcoVerify and its partners, and mission values may change.",
            "To receive them, you must be 18 or older, have a confirmed email and a linked and verified Fone Wallet (proof that the wallet is yours).",
            "EcoVerify does not hold your keys or your funds: the wallet is yours and your responsibility. Blockchain transactions are public and irreversible; a wrong address cannot be corrected.",
            "Payments are made in batches and may take a few days. Each reward goes through a waiting period before being paid (for appeals and fraud checks), and we only send once the released total reaches the minimum payout, because each transfer has a network fee. Current values are on the public Transparency page.",
            "There may be a monthly EcoVerify budget, a budget for each sponsor and a monthly FONE limit per person. When one of them is reached, points still count and the FONE waits until the team releases it.",
            "Rewards obtained through fraud may be cancelled, even after approval, as long as they have not been paid.",
            "Cryptocurrencies have variable prices and may lose value. Rewards are not an investment, a salary or a promise of earnings. Any taxes on what you receive are your responsibility.",
            "If you delete your account, rewards not yet paid are lost.",
          ]}
        />
      </LegalSection>

      <LegalSection n={6} title="Community">
        <p>
          In the chat, treat everyone with respect. It is forbidden to post illegal, offensive, discriminatory, sexual or violent
          content, spam, scams or other people’s personal data. Messages can be reported and removed, and accounts can be banned.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Trademarks">
        <p>
          EcoVerify is an independent project built on the Fone Protocol network. Fone, Fone Protocol, Fone Wallet and their logos
          belong to their respective owners. EcoVerify is not operated by Fone and is not responsible for its services, such as
          the Fone Wallet.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Cards, suspension and termination">
        <LegalList
          items={[
            "Attempts at fraud (photo from the internet, photo of a screen, reused photo, faked location, made-up report) and offences in the community may receive a card. An honest mistake, such as a dark photo or being in the wrong place by accident, does not receive a card: the proof is only rejected with the reason.",
            "Cards are given by a person from the team, never automatically by the artificial intelligence, and always with a written explanation that you receive in the app.",
            "Yellow card: the 1st and 2nd are warnings. The 3rd valid yellow card suspends the account for 14 days. Each yellow card counts for 6 months and then stops counting.",
            "During the suspension you cannot sign in, and FONE not yet paid is frozen (kept, not lost) until the suspension ends.",
            "Red card: blocks the account. It is used in serious cases or when there is a new fraud attempt right after a suspension, and it is decided by an administrator.",
            "Every card can be appealed once, in Profile → My cards. A suspended or blocked account can appeal from the screen shown when trying to sign in. The appeal is reviewed by an administrator; if it is accepted, the card is cancelled and the suspension or block is lifted.",
            "We may also end missions or the service, giving notice in advance whenever possible.",
          ]}
        />
      </LegalSection>

      <LegalSection n={9} title="Liability">
        <p>
          The app is provided as is. We do our best to keep it safe and available, but we are not responsible for failures of the
          Fone network, the Fone Wallet, the internet or your device, nor for losses caused by changes in the price of FONE.
          Nothing here limits rights the law guarantees you.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Changes and contact">
        <p>
          When these Terms change in a relevant way, we will ask you to accept the new version when you sign in. Questions:{" "}
          {contactText(info.contactEmail, "en")}. These Terms are governed by Brazilian law.
        </p>
      </LegalSection>
    </div>
  );
}
