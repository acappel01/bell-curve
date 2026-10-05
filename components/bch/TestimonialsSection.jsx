import SectionHeader from "./SectionHeader";

/**
 * Client words (backend type `testimonials`): `quotes: [{ quote, name, title }]`
 * where `title` carries the place ("Dallas, TX").
 *
 * The client asked for no stars, portraits, ages or carousel, and for the
 * first quote to lead. So the first renders large and the rest sit beside it;
 * the blueprint's `stars`, `image` and `rating_stats` are deliberately unused.
 */
export default function TestimonialsSection({ section }) {
  const data = section.data ?? {};
  const quotes = (data.quotes ?? []).filter((item) => item?.quote);

  if (!quotes.length) {
    return null;
  }

  const [featured, ...rest] = quotes;

  return (
    <section className="bch-quotes" id={section.anchor || undefined}>
      <div className="bch-container">
        <SectionHeader data={data} size="md" />
        <div className="bch-quotes__grid">
          <Quote item={featured} featured />
          {rest.map((item) => (
            <Quote key={item.name} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Quote({ item, featured = false }) {
  return (
    <figure className={`bch-quotes__item${featured ? " bch-quotes__item--featured" : ""}`}>
      <blockquote>
        <p>{item.quote}</p>
      </blockquote>
      <figcaption>
        {item.name}
        {item.title ? <span> · {item.title}</span> : null}
      </figcaption>
    </figure>
  );
}
