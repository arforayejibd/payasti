const { SITE_NAME, TAGLINE, SITE_SUBTITLE, SITE_URL, DEFAULT_DESCRIPTION, OG_IMAGE } = require('../config/constants');

function generateSeoMeta(options = {}) {
  const {
    title,
    description,
    image,
    url,
    type = 'website',
    author,
    publishedTime,
    modifiedTime,
    keywords = [],
    schema = null,
    exactTitle = null
  } = options;

  const pageTitle = exactTitle || (title 
    ? `${title} | ${SITE_NAME} - ${TAGLINE}` 
    : `${SITE_NAME} - ${TAGLINE} | ${SITE_SUBTITLE}`);

  const metaDesc = (description || DEFAULT_DESCRIPTION)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);

  const canonicalUrl = url ? `${SITE_URL}${url}` : `${SITE_URL}/`;
  const ogImage = image || OG_IMAGE;

  return {
    title: pageTitle,
    description: metaDesc,
    canonical: canonicalUrl,
    og: {
      title: pageTitle,
      description: metaDesc,
      url: canonicalUrl,
      type: type,
      image: ogImage,
      site_name: `${SITE_NAME} - ${TAGLINE}`,
      locale: 'bn_BD'
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: metaDesc,
      image: ogImage
    },
    articleMeta: type === 'article' ? {
      author: author || 'পয়স্তি লেখক',
      publishedTime: publishedTime,
      modifiedTime: modifiedTime || publishedTime
    } : null,
    schemaJson: schema ? JSON.stringify(schema) : null
  };
}

// Generate Google Structured Data (JSON-LD)
function getArticleSchema(post, author, category) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/post/${post.slug}`
    },
    'headline': post.title,
    'description': post.excerpt || post.title,
    'image': post.featured_image ? [post.featured_image] : [`${SITE_URL}/images/payasti-og-banner.png`],
    'datePublished': post.published_at || post.created_at,
    'dateModified': post.updated_at || post.published_at || post.created_at,
    'inLanguage': 'bn-BD',
    'author': {
      '@type': 'Person',
      'name': author ? (author.display_name || author.username) : 'পয়স্তি লেখক',
      'url': author ? `${SITE_URL}/author/${author.nicename || author.username}` : SITE_URL
    },
    'publisher': {
      '@type': 'Organization',
      'name': `${SITE_NAME} - ${TAGLINE}`,
      'url': SITE_URL,
      'logo': {
        '@type': 'ImageObject',
        'url': `${SITE_URL}/images/payasti-logo.png`
      }
    },
    'articleSection': category ? category.name : 'সাহিত্য'
  };
}

function getBookSchema(book) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    'name': book.title,
    'author': {
      '@type': 'Person',
      'name': book.author_name
    },
    'image': book.cover_image,
    'description': book.description || book.title,
    'offers': {
      '@type': 'Offer',
      'price': book.discounted_price ? book.discounted_price.replace(/[^\d]/g, '') : '',
      'priceCurrency': 'BDT',
      'availability': 'https://schema.org/InStock',
      'url': book.order_url || `${SITE_URL}/book/${book.slug}`
    }
  };
}

function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['NewsMediaOrganization', 'Organization'],
        '@id': `${SITE_URL}/#organization`,
        'name': 'Payasti Magazine',
        'url': SITE_URL,
        'sameAs': ['https://www.facebook.com/payastimagazine/'],
        'logo': {
          '@type': 'ImageObject',
          '@id': `${SITE_URL}/#logo`,
          'url': `${SITE_URL}/images/Payasti-logo.png`,
          'contentUrl': `${SITE_URL}/images/Payasti-logo.png`,
          'inLanguage': 'bn-BD'
        }
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        'url': SITE_URL,
        'name': `${SITE_NAME} - ${TAGLINE}`,
        'publisher': { '@id': `${SITE_URL}/#organization` },
        'inLanguage': 'bn-BD',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${SITE_URL}/?s={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        'url': `${SITE_URL}/`,
        'name': `${SITE_NAME} - ${TAGLINE} | ${SITE_SUBTITLE}`,
        'about': { '@id': `${SITE_URL}/#organization` },
        'isPartOf': { '@id': `${SITE_URL}/#website` },
        'inLanguage': 'bn-BD'
      }
    ]
  };
}

function getBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': `${SITE_URL}${item.url}`
    }))
  };
}

module.exports = {
  generateSeoMeta,
  getArticleSchema,
  getBookSchema,
  getWebsiteSchema,
  getBreadcrumbSchema
};
