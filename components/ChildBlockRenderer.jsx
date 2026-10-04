/**
 * Renders a TYPED SUB-BLOCK envelope: { type, data, has_content }.
 *
 * The child-level twin of SectionRenderer. A section's `data.children` holds
 * a repeater of these; dispatch on `type` exactly as sections dispatch on
 * theirs. Contract: prx-backend `docs/frontend/dev.md` §4c.
 *
 * Three deliberate differences from SectionRenderer, each with a reason:
 *
 *  - NO PLACEHOLDER. An unknown SECTION type dumps its payload visibly so a
 *    missing component is obvious. A child has no such affordance — it would
 *    appear as a hole inside an otherwise correct section — and the backend
 *    already drops a child whose block type no longer resolves, so an
 *    unregistered type here is a frontend gap the operator cannot see or fix.
 *    Render nothing and leave the section intact.
 *  - NO `has_content` FALLBACK. `children` only exists on payloads new enough
 *    to carry the flag, so the heuristic SectionRenderer keeps for older
 *    payloads has nothing to be compatible with here.
 *  - AN `sxb-*` KNOB VOCABULARY, not `sx-*`. See lib/sectionKnobs.js — the
 *    section classes are descendant-scoped and a child wearing them would
 *    bleed out of its parent's content column.
 */

import { knobs, BLOCK_PREFIX } from "@/lib/sectionKnobs";

import TestimonialCard from "@/components/blocks/TestimonialCard";

const CHILD_COMPONENTS = {
  testimonial: TestimonialCard,
};

/** The blocks in a section's payload that resolve to something renderable. */
export function renderableChildren(data, types = null) {
  return (data?.children ?? []).filter(
    (child) =>
      child?.has_content &&
      CHILD_COMPONENTS[child.type] &&
      (types === null || types.includes(child.type)),
  );
}

/**
 * One child, wrapped in its own knob layer when the operator set anything.
 *
 * The wrapper is a level ABOVE the block's own markup, so `content_inset` on
 * a card-shaped child moves the card rather than eating into the padding the
 * card's design owns — the same three-level rule the card-shaped sections
 * follow (band > column > card).
 */
export default function ChildBlock({ block }) {
  const Component = CHILD_COMPONENTS[block?.type];

  if (!Component || !block?.has_content) {
    return null;
  }

  const { className, style } = knobs(block.data, BLOCK_PREFIX);

  if (className) {
    return (
      <div className={`sxb-block ${className}`} style={style}>
        <Component data={block.data ?? {}} />
      </div>
    );
  }

  return <Component data={block.data ?? {}} />;
}
