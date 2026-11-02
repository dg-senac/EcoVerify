import { MIN_AGE, type LegalInfo } from "@/lib/legal";
import { LegalList, LegalSection, contactText } from "./legal-ui";

/** English translation of the Privacy Policy. The Portuguese version (privacy-content.tsx) prevails: keep both in sync. */
export function PrivacyEn({ info }: { info: LegalInfo }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">
        This Policy explains which personal data EcoVerify processes, why, and what your rights are. The data controller is{" "}
        <b>{info.controllerName}</b>. Contact for privacy matters (data protection officer): {contactText(info.contactEmail, "en")}.
      </p>

      <LegalSection n={1} title="Data we process and why">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Data</th>
                <th className="py-2 pr-3 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Legal basis (LGPD, art. 7)</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {[
                ["Name, email and password (stored only as a hash)", "Create and protect your account, send account notices", "Performance of a contract (V)"],
                ["Photos, report and location (GPS) at the time of the proof", "Check that the action happened at the mission location and moderate it", "Performance of a contract (V) and legitimate interest in fraud prevention (IX)"],
                ["Fingerprint (hash) of the photos, including a version that recognizes near-identical photos", "Prevent the same photo from being reused", "Legitimate interest in fraud prevention (IX)"],
                ["Result of the automatic check (verdict, confidence, reason and notes)", "Help moderation and decide clear cases", "Performance of a contract (V) and legitimate interest in fraud prevention (IX)"],
                ["Appeal against an automatic decision", "Review by a person (LGPD, art. 20)", "Regular exercise of rights (VI)"],
                ["Cards (yellow/red), reason, the team's explanation, suspensions, blocks and your appeals", "Prevent fraud, apply the rules in the Terms (section 8) and allow your defence", "Legitimate interest in fraud prevention (IX) and regular exercise of rights (VI)"],
                ["FONE wallet address, verification transaction and 18+ declaration", "Prove that the wallet is yours and pay rewards only to adults", "Performance of a contract (V)"],
                ["Points, rewards and payments", "Ranking, history and accountability for payments", "Performance of a contract (V) and compliance with a legal obligation (II)"],
                ["“I want more missions here” requests (city only) and mission suggestions (text and the chosen point)", "Know where missions are missing and create actions proposed by the community", "Legitimate interest (IX) and performance of a contract (V)"],
                ["Community chat messages and media", "Running the chat and moderating reports", "Performance of a contract (V)"],
                ["Acceptance of the Terms (date and version) and preferences (language, accessibility)", "Record of acceptance and personalization", "Compliance with a legal obligation (II) and performance of a contract (V)"],
                ["IP address (temporary, in memory) and session cookie", "Keep you signed in and limit sign-in and sign-up attempts", "Legitimate interest in security (IX)"],
              ].map(([data, purpose, basis]) => (
                <tr key={data} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-800">{data}</td>
                  <td className="py-2 pr-3">{purpose}</td>
                  <td className="py-2">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We do not sell your data and do not use it for advertising. Location is read only when you send a proof, suggest a
          mission or ask to see missions near you, never in the background. To show missions near you, the city and rounded
          coordinates (about 1 km) are kept only in a cookie on your device, not in our database; the city name is worked out
          inside the app itself, without sending your position to other services. Before storing the photo, we remove the file
          metadata (EXIF), such as the device model and embedded coordinates.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Automatic check of proofs">
        <LegalList
          items={[
            "Each proof goes through automatic rules (distance to the mission, GPS accuracy, repeated photo) and, when enabled, through an artificial intelligence model that describes the photo and says whether it matches the mission.",
            <>To do this we send the <b>Google Gemini</b> service (Google LLC, USA) only a <b>reduced copy of the photo, without metadata</b>, the mission title and instructions and your report. <b>We do not send</b> your name, email, location or any identifier of your account.</>,
            "During the testing phase we use Gemini's free tier. On that tier Google may use the content sent to improve its products, and it may be read by human reviewers. That is why we ask that your report contains no personal data and that you avoid photographing other people's faces.",
            <>When <b>reverse image search</b> is enabled, the same reduced copy without metadata (only the image, without the report or account data) is sent to <b>Google Cloud Vision</b> (Google LLC, USA, a paid service that does not use the content to train models) to look for the photo on the internet. If it is found, the links go to the team, who check before deciding: this never rejects the photo on its own nor creates a card.</>,
            "Clear cases may be approved or rejected automatically (automated decision). Every rejection states the reason, higher-value missions always go through a person and, if the service is unavailable, the proof goes to moderation.",
            <><b>Review (LGPD, art. 20):</b> you can appeal any automatic rejection in My Submissions, and a person from moderation reviews it again. You can also ask for information about the criteria used.</>,
          ]}
        />
      </LegalSection>

      <LegalSection n={3} title="Who sees your data">
        <LegalList
          items={[
            "Other users see your name, points and level in the ranking, and your messages in the chat.",
            "Moderators and administrators see proofs (photo, report and location) in order to review them, and administrators see the wallet in order to make payments.",
            "Processors that help us operate, under contract: app hosting, database and file storage (for example, Vercel and Supabase), email delivery (for example, Resend) and automatic photo checks (Google Gemini and, when enabled, Google Cloud Vision; see section 2). Some of these services are outside Brazil; in those cases, the transfer follows the safeguards of the LGPD (art. 33).",
            "To supply regions without missions and, outside Brazil, to name your area, the server queries OpenStreetMap (an open, collaborative map) for beaches, parks and collection points nearby. That query only includes the position of the chosen region: in Brazil, the municipality's centre; in other countries, a rounded point (~1 km) of the region. Account data is never sent.",
            "Authorities, when required by law or a court order.",
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="Blockchain: what is public and permanent">
        <p>
          FONE payments and the wallet verification transfer are recorded on the Fone Protocol blockchain, which is
          <b> public</b>: anyone can see the address, amount and date in the network explorer. These records{" "}
          <b>cannot be erased</b> by anyone, not even if you delete your account. EcoVerify does not publish your name or email on
          the blockchain.
        </p>
        <p className="mt-2">
          On the public <b>Transparency</b> page we show app totals and the latest payments (date, amount, shortened address and
          transaction link), <b>without name, email or photo</b>.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Children and teenagers">
        <p>
          EcoVerify is not intended for people under {MIN_AGE}. Teenagers aged {MIN_AGE} to 17 may only use it with the permission
          of their legal guardian and do not receive FONE. We process their data in their best interest (LGPD, art. 14) and only as
          needed to take part in missions. If you are a guardian and want to request the deletion of a minor’s account, contact us.
        </p>
      </LegalSection>

      <LegalSection n={6} title="How long we keep data">
        <LegalList
          items={[
            "For as long as your account exists.",
            "When you delete your account, we erase your name, email, password, photos, reports, location, messages, wallet, notifications and sessions. We keep, without identification, what is needed to meet obligations and prevent fraud (LGPD, art. 16): the record of proofs already reviewed (without photo, report, location or automatic-check notes), the photo hashes, the points history and payments already made.",
            "Email confirmation links are valid for 48 hours and password reset links for 1 hour.",
          ]}
        />
      </LegalSection>

      <LegalSection n={7} title="Your rights (LGPD, art. 18)">
        <LegalList
          items={[
            <><b>Access and portability:</b> download your data in Settings → Privacy and data.</>,
            <><b>Correction:</b> change your name and preferences in the app or contact us.</>,
            <><b>Deletion:</b> delete your account in Settings → Privacy and data.</>,
            <><b>Review of automated decisions:</b> appeal in My Submissions (see section 2).</>,
            "Information about sharing and objection to processing based on legitimate interest: contact us.",
            "You can also file a complaint with Brazil's National Data Protection Authority (ANPD).",
          ]}
        />
      </LegalSection>

      <LegalSection n={8} title="Security">
        <p>
          Passwords stored with a hash (bcrypt), encrypted connection, files in private storage accessible only to signed-in users,
          a limit on sign-in attempts and a record of who approves and pays. If there is an incident that may put you at risk, we
          will notify you and the ANPD.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cookies">
        <p>
          We only use essential cookies: one that keeps you signed in and, if you choose a region on the missions screen, another
          that stores that region (city, radius and rounded coordinates) for up to 180 days. You can change or clear the region at
          any time in “See all”. We do not use advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Changes">
        <p>When this Policy changes in a relevant way, we will let you know in the app and ask you to accept the new version.</p>
      </LegalSection>
    </div>
  );
}
