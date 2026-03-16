/**
 * Rank Calculator — finds a domain in SERP organic results
 */

/**
 * Normalize a domain for comparison (strip www, protocol, trailing slash)
 */
function normalizeDomain(domain) {
    return domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');
}

/**
 * Find a domain in a list of SERP items.
 * Returns rank_group (organic-only rank: #1 = first organic result,
 * regardless of how many map/ad entries appear above it).
 *
 * @param {string} domain  - e.g. "example.com"
 * @param {Array}  items   - organicResults from DataForSEOService (already filtered to type=organic)
 * @returns {{ found, position, url, title, description }}
 */
function findDomainInResults(domain, items) {
    const needle = normalizeDomain(domain);

    for (const item of items) {
        // Belt-and-suspenders: only consider organic items
        if (item.type !== 'organic') continue;

        const itemDomain = normalizeDomain(item.domain || item.url || '');
        if (itemDomain.includes(needle) || needle.includes(itemDomain)) {
            return {
                found: true,
                // rank_group = position within organic results only (ignores maps, ads, etc.)
                position: item.rank_group ?? item.rank_absolute ?? item.position,
                url: item.url,
                title: item.title,
                description: item.description
            };
        }
    }

    return { found: false, position: null, url: null, title: null, description: null };
}

/**
 * Get top N organic results for display
 */
function getTopResults(items, limit = 10) {
    return items
        .filter(i => i.type === 'organic')
        .slice(0, limit)
        .map(i => ({
            position: i.rank_group ?? i.rank_absolute ?? i.position,
            domain: i.domain,
            url: i.url,
            title: i.title,
            description: i.description
        }));
}

module.exports = { findDomainInResults, getTopResults, normalizeDomain };
