import { getCatalogProducts, getConfig } from "@/lib/api";
import { serviceAction } from "@/lib/services";
import StartFlow from "./StartFlow";

/**
 * The BCH start-here flow (`/start-here`): a few questions, then the next step
 * that fits — Care, the Shop, Membership, the Health Map or the library.
 *
 * The questions are an admin-authored quiz in the backend's quiz shape (steps,
 * questions, options, `visible_when` branching), walked by `useQuizFlow`, the
 * same hook as the Atlas quiz. Each outcome's call to action is resolved here
 * against the service switches, so a Care recommendation says "Join the
 * telehealth waitlist" while Care is on a waitlist and "Check care
 * availability" once it is live, without anyone editing the quiz.
 *
 * Products for the "you might start with" row are the shop's own, matched by
 * goal in the browser for the proof. Prescription items are never suggested
 * here; they come through a clinician.
 */
export default async function StartHere({ quiz }) {
  const [config, products] = await Promise.all([getConfig(), getCatalogProducts({ per_page: "50" })]);

  const outcomes = Object.fromEntries(
    Object.entries(quiz.outcomes ?? {}).map(([key, outcome]) => {
      const action = outcome.service ? serviceAction(config?.services, outcome.service) : null;

      return [
        key,
        {
          ...outcome,
          cta_label: action?.label ?? outcome.cta_label ?? null,
          cta_url: action?.url ?? outcome.cta_url ?? null,
          status: action?.status ?? null,
        },
      ];
    }),
  );

  const shelf = (products?.data ?? [])
    .filter((product) => !product.rx_required && product.is_in_stock !== false)
    .map(({ id, slug, name, subtitle, short_description, hero_image_url, price, price_from, health_goals, badge_text }) => ({
      id,
      slug,
      name,
      subtitle,
      short_description,
      hero_image_url,
      price,
      price_from,
      health_goals,
      badge_text,
    }));

  return <StartFlow quiz={{ ...quiz, outcomes }} products={shelf} />;
}
